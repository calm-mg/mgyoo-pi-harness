// MCP over newline-delimited stdio. Only the supplied patch text is inspected.
import { createInterface } from 'node:readline';

const tool = {
  name: 'count_changes', description: 'Count added and removed lines in unified diff hunks.',
  inputSchema: { type: 'object', properties: { patch: { type: 'string' } }, required: ['patch'], additionalProperties: false },
};

function dispatch(method, params) {
  switch (method) {
    case 'initialize': return { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'diffstat', version: '1.0.0' } };
    case 'ping': return {};
    case 'tools/list': return { tools: [tool] };
    case 'tools/call': {
      const patch = params?.arguments?.patch;
      if (params?.name !== tool.name || typeof patch !== 'string') break;
      let added = 0, removed = 0, inHunk = false;
      for (const line of patch.split('\n')) {
        if (line.startsWith('@@ ')) inHunk = true;
        else if (!line || !' +-\\'.includes(line[0])) inHunk = false;
        else if (inHunk && line[0] === '+') added++;
        else if (inHunk && line[0] === '-') removed++;
      }
      return { content: [{ type: 'text', text: `+${added} -${removed}` }] };
    }
  }
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  let id = null, reply;
  try {
    const req = JSON.parse(line);
    if (!Object.hasOwn(req, 'id')) continue; // notification
    id = req.id;
    const result = dispatch(req.method, req.params);
    reply = result ? { result } : { error: req.method === 'tools/call' ? { code: -32602, message: 'Expected count_changes and a patch string' } : { code: -32601, message: 'Method not found' } };
  } catch { reply = { error: { code: -32700, message: 'Parse error' } }; }
  console.log(JSON.stringify({ jsonrpc: '2.0', id, ...reply }));
}
