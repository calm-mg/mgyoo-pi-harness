import { readFileSync } from 'node:fs';

// A local slash command, not a prompt: no model, shell or credentials needed.
export default function status(api) {
  api.registerCommand('harness-status', {
    description: '현재 세션에 로드된 리뷰 스킬과 MCP 도구를 확인합니다.',
    handler(_args, ctx) {
      const instructions = readFileSync(new URL('./AGENTS.md', import.meta.url), 'utf8').trim();
      const applied = [ctx.getSystemPrompt()].flat().join('\n').includes(instructions);
      const review = api.getCommands().some(c => c.source === 'skill' && c.name === 'skill:harness-review');
      const mcp = api.getAllTools().map(t => t.name).filter(n => n.startsWith('mcp__')).sort();
      ctx.ui.notify(`AGENTS.md: ${applied ? 'OK' : '미발견'}\nharness-review: ${review ? 'OK' : '미발견'}\nMCP: ${mcp.join(', ') || '없음'}`, 'info');
    },
  });
}
