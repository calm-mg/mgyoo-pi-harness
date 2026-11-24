// Opt-in integration check: downloads the pinned runtimes. Never use a user's agent home.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const win = process.platform === 'win32';
const temp = mkdtempSync(join(tmpdir(), 'harness smoke '));
const home = join(temp, 'home'), cwd = join(temp, 'work space'), bin = join(temp, 'user bin');
const state = join(home, '.mgyoo-harness');
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(systemroot|windir|comspec|pathext|programfiles(?:\(x86\))?|programdata|systemdrive)$/i.test(k)));
Object.assign(env, { PATH: [bin, dirname(process.execPath), process.env.PATH].join(delimiter), HOME: home, USERPROFILE: home,
  LOCALAPPDATA: join(home, 'Local'), APPDATA: join(home, 'Roaming'), TMPDIR: temp, TMP: temp, TEMP: temp, MGYOO_HARNESS_BIN_DIR: bin });
const options = { cwd, env, encoding: 'utf8', windowsHide: true };
function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { ...options, timeout: 600_000, ...opts });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return result.stdout;
}
function bootstrap(action) {
  return win ? run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(repo, `${action}.ps1`)]) : run('sh', [join(repo, `${action}.sh`)]);
}
const launcher = win ? [env.ComSpec || 'cmd.exe', '/d', '/c', 'harness'] : [join(bin, 'harness')];
const harness = (...args) => run(launcher[0], [...launcher.slice(1), ...args]);

// Keep stdin open through dispatch: EOF before the response races RPC startup.
async function rpcNotice(tool, command, prefix, extraArgs) {
  const args = ['run', tool, '--host', '--', '--mode', 'rpc', '--no-session', ...extraArgs];
  if (tool === 'omp') args.push('--offline', '--no-title');
  const child = spawn(launcher[0], [...launcher.slice(1), ...args], { ...options, timeout: 90_000, stdio: ['pipe', 'pipe', 'inherit'] });
  const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  const lines = createInterface({ input: child.stdout });
  child.stdin.write(JSON.stringify({ type: 'prompt', id: 'probe', message: command }) + '\n');
  let message;
  for await (const line of lines) {
    const event = JSON.parse(line);
    if (event.method === 'notify' && event.message.startsWith(prefix)) message = event.message;
    if (event.id === 'probe' && event.type === 'response') child.stdin.end();
  }
  assert.equal(await closed, 0);
  return message;
}
async function status(tool, expectedMcp) {
  const message = await rpcNotice(tool, '/harness-status', 'AGENTS.md:', ['--model', 'openai/gpt-5.2']);
  assert.equal(message, `AGENTS.md: OK\nharness-review: OK\nMCP: ${expectedMcp}`);
  console.log(`${tool}: ${message.replaceAll('\n', ' · ')}`);
}

async function checkClaudeWork() {
  const agent = join(state, 'host', 'omp', '.omp', 'profiles', 'mgyoo', 'agent');
  const config = join(agent, 'config.yml');
  const base = { default: 'openai/gpt-5.2:low', tiny: 'openai/gpt-5-mini:low' };
  const original = JSON.stringify({ modelRoles: base }) + '\n';
  writeFileSync(config, original);
  // Expose bundled rows without accounts or keys. No model replies: only a local slash command runs.
  writeFileSync(join(agent, 'models.yml'), JSON.stringify({ providers: Object.fromEntries(
    ['anthropic', 'openai'].map(p => [p, { auth: 'none', baseUrl: 'http://127.0.0.1:1' }])) }));
  const probe = join(temp, 'read-roles.mjs');
  writeFileSync(probe, `export default pi => pi.registerCommand('read-roles', {
    handler: async (_, ctx) => ctx.ui.notify(JSON.stringify({
      roles: pi.pi.settings.getModelRoles(), active: ctx.model.provider + '/' + ctx.model.id, effort: pi.getThinkingLevel()
    }))
  });`);
  const opus = 'anthropic/claude-opus-5-5:high', sonnet = 'anthropic/claude-sonnet-5-5:high';
  const fable = 'anthropic/claude-fable-5-2:high';
  const work = { ...base, default: opus, slow: opus, smol: sonnet, vision: sonnet, task: sonnet,
    plan: fable, advisor: fable, commit: 'anthropic/claude-haiku-5-5:medium' };
  for (const [roles, flags] of [[work, ['--config', join(repo, 'presets', 'claude-work.yml')]], [base, []]]) {
    const result = JSON.parse(await rpcNotice('omp', '/read-roles', '{"roles":', ['-e', probe, ...flags]));
    const [active, effort] = roles.default.split(':');
    assert.deepEqual(result, { roles, active, effort });
    assert.equal(readFileSync(config, 'utf8'), original);
  }
  console.log('OMP: Claude roles and effort on, GPT default off, inherited tiny and unchanged config.yml');
}

try {
  mkdirSync(cwd); mkdirSync(home);
  const originals = ['.pi/agent/settings.json', '.omp/agent/config.yml'].map(p => join(home, p));
  for (const file of originals) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, '{}\n'); }
  bootstrap('install'); assert.match(bootstrap('install'), /unchanged/i);
  for (const tool of ['pi', 'omp']) {
    harness('setup', tool, '--dry-run'); harness('setup', tool); harness('setup', tool);
    harness('doctor', tool, '--host'); await status(tool, '없음');
  }
  await checkClaudeWork();
  // Checkpoint by moving (not copying) the stopped profiles: auth stays private.
  const profiles = join(state, 'host'), snapshot = join(state, 'host.before');
  const settings = join('pi', 'agent', 'settings.json');
  writeFileSync(join(profiles, settings), '{"quietStartup":true}\n');
  renameSync(profiles, snapshot); harness('setup', 'pi');
  assert.equal(existsSync(join(profiles, settings)), false);
  renameSync(profiles, join(state, 'host.trial')); renameSync(snapshot, profiles);
  assert.match(readFileSync(join(profiles, settings), 'utf8'), /quietStartup/);
  harness('doctor', 'pi', '--host');

  // Only this disposable project opts in. No profile registration, network MCP or provider key.
  const example = join(repo, 'examples', 'mcp');
  mkdirSync(join(cwd, '.omp')); cpSync(join(example, 'diff-stat.mjs'), join(cwd, 'diff-stat.mjs'));
  cpSync(join(example, 'mcp.example.json'), join(cwd, '.omp', 'mcp.json'));
  // OMP's default 250 ms discovery window may return before a cold stdio child is ready.
  writeFileSync(join(cwd, '.omp', 'config.yml'), 'mcp:\n  startupTimeoutMs: 0\n');
  await status('omp', 'mcp__diffstat_count_changes');
  const call = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'count_changes', arguments: { patch: '@@ -1 +1,2 @@\n-old\n+new\n+extra' } } };
  const reply = JSON.parse(run(process.execPath, ['--permission', './diff-stat.mjs'], { input: JSON.stringify(call) + '\n' }));
  assert.equal(reply.result.content[0].text, '+2 -1');
  bootstrap('uninstall'); assert.equal(existsSync(join(bin, win ? 'harness.cmd' : 'harness')), false);
  for (const file of originals) assert.equal(readFileSync(file, 'utf8'), '{}\n');
  console.log('OK: repeated setup, profile rollback, opt-in MCP, original settings and uninstall');
} finally { rmSync(temp, { recursive: true, force: true, maxRetries: 3 }); }
