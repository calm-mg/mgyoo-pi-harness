import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cp, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));
const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn() }));
vi.mock('node:child_process', async original => ({ ...await original(), spawnSync }));
const output = (stdout = '', status = 0) => ({ stdout, stderr: '', status });
let temp, workspace, state, checkout, sandbox, cached, builtLabel;
function buildDocker() {
  spawnSync.mockImplementation((name, args) => {
    expect(name).toBe('docker');
    switch (args[0]) {
      case 'context': return output('unix:///var/run/docker.sock');
      case 'version': return output('28.0.1 linux');
      case 'image': return output(cached && args.includes(builtLabel) ? 'sha256:chosen' : '');
      case 'build':
        builtLabel = `label=${args[args.indexOf('--label') + 1]}`;
        cached = true;
        return output('sha256:chosen');
      case 'run': return output('', 19);
      default: throw new Error(`Unexpected command: ${args[0]}`);
    }
  });
}
beforeEach(async () => {
  temp = await realpath(await mkdtemp(join(tmpdir(), 'sandbox test ')));
  state = join(temp, 'state');
  workspace = join(temp, 'comma, space');
  checkout = join(temp, 'checkout');
  const home = join(temp, 'home');
  await mkdir(home);
  await Promise.all([mkdir(workspace), mkdir(state), mkdir(checkout)]);
  await Promise.all(['.dockerignore', 'container', 'config', 'extensions'].map(p => cp(join(source, p), join(checkout, p), { recursive: true })));
  vi.resetModules();
  vi.doMock('node:os', async original => ({ ...await original(), homedir: () => home }));
  vi.doMock('../../lib/catalog.mjs', async original => ({ ...await original(), ROOT: checkout, HOME: state }));
  vi.spyOn(process, 'cwd').mockReturnValue(workspace);
  vi.stubEnv('DOCKER_HOST', '');
  vi.stubEnv('DOCKER_CONTEXT', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  spawnSync.mockReset();
  cached = false;
  buildDocker();
  sandbox = await import('../../lib/sandbox.mjs');
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.doUnmock('../../lib/catalog.mjs');
  vi.doUnmock('node:os');
  await rm(temp, { recursive: true, force: true });
});
const calls = command => spawnSync.mock.calls.map(([, args]) => args).filter(args => args[0] === command);

describe('safe mode', () => {
  it('checks readiness without building; builds on first use and changed inputs only', async () => {
    expect(sandbox.safeDoctor('omp')).toBe(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('자동 빌드 예정'));
    expect(calls('build')).toHaveLength(0);
    for (let n = 0; n < 2; ++n) expect(sandbox.safeRun('omp', ['one arg', '--privileged'])).toBe(19);
    const [build] = calls('build');
    expect(calls('build')).toHaveLength(1);
    expect(build).toContain('TOOL=omp');
    const [run] = calls('run');
    expect(run.slice(-2)).toEqual(['one arg', '--privileged']);
    expect(run.indexOf('--privileged')).toBeGreaterThan(run.indexOf('sha256:chosen'));
    expect(run.filter(arg => arg.startsWith('type='))).toEqual([
      `type=bind,"source=${workspace}",target=/workspace,bind-recursive=disabled`,
      expect.stringMatching(/^type=volume,source=mgyoo-harness-omp-[a-f0-9]{16},target=\/state,volume-nocopy$/),
    ]);
    await writeFile(join(checkout, 'config', 'AGENTS.md'), 'updated');
    expect(sandbox.safeRun('omp', [])).toBe(19);
    expect(calls('build')).toHaveLength(2);
  });

  it('does not run Docker from private or overly broad workspaces', async () => {
    const nested = join(state, 'project');
    await mkdir(nested);
    for (const path of [state, nested, temp, join(temp, 'home')]) {
      process.cwd.mockReturnValue(path);
      expect(sandbox.safeRun('pi', [])).toBe(1);
      expect(spawnSync).not.toHaveBeenCalled();
    }
  });

  it('never launches the tool after CLI, daemon, or context failure', () => {
    spawnSync.mockReturnValueOnce({ error: Object.assign(new Error('docker'), { code: 'ENOENT' }) });
    expect(sandbox.safeRun('pi', [])).toBe(1);
    expect(console.error).toHaveBeenLastCalledWith(expect.stringContaining('Docker CLI'));
    spawnSync.mockReturnValueOnce(output('unix:///run/docker.sock')).mockReturnValueOnce(output('', 1));
    expect(sandbox.safeDoctor('omp')).toBe(1);
    expect(console.error).toHaveBeenLastCalledWith(expect.stringContaining('데몬'));
    spawnSync.mockReturnValueOnce(output('ssh://somewhere'));
    expect(sandbox.safeRun('omp', [])).toBe(1);
    expect(console.error).toHaveBeenLastCalledWith(expect.stringContaining('원격'));
    expect(calls('run')).toHaveLength(0);
    expect(calls('build')).toHaveLength(0);
    expect(spawnSync.mock.calls.every(([name]) => name === 'docker')).toBe(true);
  });
});
