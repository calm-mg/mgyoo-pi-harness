import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import protectEnv from '../../config/protect-env.js';
import { PI_PACKAGE, TOOLS } from '../../lib/catalog.mjs';

const original = fileURLToPath(new URL('../../', import.meta.url));
let temp, home, root, profiles;
beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), 'harness profile '));
  home = join(temp, 'state');
  root = join(temp, 'checkout');
  await cp(join(original, 'config'), join(root, 'config'), { recursive: true });
  vi.resetModules();
  vi.doMock('../../lib/catalog.mjs', async importOriginal => ({ ...await importOriginal(), HOME: home, ROOT: root }));
  profiles = await import('../../lib/profiles.mjs');
});
afterEach(async () => {
  vi.doUnmock('../../lib/catalog.mjs');
  vi.unstubAllEnvs();
  await rm(temp, { recursive: true, force: true });
});

// A local npm package fixture with a versioned manifest; no real setup or network on CI.
const pi = TOOLS.pi.version;
const piPackage = () => join(home, 'runtimes/pi', pi, 'node_modules', PI_PACKAGE);
async function privatePi(version = pi, bin = 'dist/bundle/cli.js') {
  await mkdir(join(piPackage(), 'dist/bundle'), { recursive: true });
  await writeFile(join(piPackage(), 'package.json'), JSON.stringify({ name: PI_PACKAGE, version, bin: { pi: bin } }));
  await writeFile(join(piPackage(), 'dist/bundle/cli.js'), `console.log(${JSON.stringify(pi)})\n`);
}

describe('host setup', () => {
  it('previews each tool without running wrappers, creating state or installing anything', async () => {
    vi.stubEnv('PATH', temp);
    for (const tool of ['omp', 'pi']) {
      await profiles.setup(tool, true);
      await expect(profiles.hostLaunch(tool)).rejects.toThrow(`harness setup ${tool}`);
    }
    expect(await readdir(temp)).toEqual(['checkout']);
  });

  it('reapplies clean resources, leaves local changes alone and does not inherit Pi sessions', async () => {
    await privatePi();
    const profile = join(home, 'host/pi');
    const app = join(profile, 'resources/config/AGENTS.md');
    const receipt = join(profile, 'managed.json');
    vi.stubEnv('PI_CODING_AGENT_SESSION_DIR', join(temp, 'original-sessions'));
    await profiles.setup('pi');
    const first = await stat(receipt, { bigint: true });
    await profiles.setup('pi');
    expect((await stat(receipt, { bigint: true })).mtimeNs).toBe(first.mtimeNs);
    const source = join(root, 'config/AGENTS.md');
    await writeFile(source, 'updated instructions\n');
    await profiles.setup('pi', true);
    expect(await readFile(app, 'utf8')).not.toBe('updated instructions\n');
    await profiles.setup('pi');
    expect(await readFile(app, 'utf8')).toBe('updated instructions\n');
    await writeFile(app, 'local edits\n');
    await expect(profiles.setup('pi')).rejects.toThrow(app);
    expect(await readFile(app, 'utf8')).toBe('local edits\n');
    const launch = await profiles.hostLaunch('pi');
    expect(launch.env.PI_CODING_AGENT_DIR).toBe(join(profile, 'agent'));
    expect(launch.env.PI_CODING_AGENT_SESSION_DIR).toBeUndefined();
    expect(launch.command).toBe(process.execPath);
    expect(launch.args[0]).toBe(join(piPackage(), 'dist/bundle/cli.js'));
    expect(launch.args).toContain(app);
    expect(launch.args.some(arg => arg.includes('workspace-guard'))).toBe(false);
  });

  it('discovers added skills and hooks, then removes only unmodified obsolete resources', async () => {
    await privatePi();
    await profiles.setup('pi');
    const config = join(root, 'config');
    const managed = join(home, 'host/pi/resources/config');
    const skill = 'skills/new-review/SKILL.md';
    await mkdir(dirname(join(config, skill)), { recursive: true });
    await writeFile(join(config, skill), '---\nname: new-review\ndescription: Review tests\n---\n');
    const manifest = JSON.parse(await readFile(join(config, 'package.json'), 'utf8'));
    manifest.pi.extensions.push('./notify.js');
    await writeFile(join(config, 'package.json'), JSON.stringify(manifest));
    await writeFile(join(config, 'notify.js'), 'export default api => api.on("session_start", () => {});');
    await profiles.setup('pi');
    expect(await readFile(join(managed, skill), 'utf8')).toContain('new-review');
    expect(await readFile(join(managed, 'notify.js'), 'utf8')).toContain('session_start');
    await rm(join(config, skill));
    manifest.pi.extensions.pop();
    await writeFile(join(config, 'package.json'), JSON.stringify(manifest));
    await writeFile(join(managed, 'notify.js'), '// local changes');
    await expect(profiles.setup('pi')).rejects.toThrow(join(managed, 'notify.js'));
    expect(await readFile(join(managed, 'notify.js'), 'utf8')).toBe('// local changes');
    await rm(join(managed, 'notify.js'));
    await profiles.setup('pi');
    await expect(stat(join(managed, skill))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not adopt an identical user-owned file on first install', async () => {
    await privatePi();
    const file = 'config/AGENTS.md';
    const original = await readFile(join(root, file), 'utf8');
    const dest = join(home, 'host/pi/resources', file);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, original);
    await profiles.setup('pi');
    await writeFile(join(root, file), 'changed after first setup');
    await expect(profiles.setup('pi')).rejects.toThrow(dest);
    expect(await readFile(dest, 'utf8')).toBe(original);
  });

  it('never overwrites unmanaged files or installs a different runtime in their place', async () => {
    const existing = join(home, 'host/pi/resources/config/AGENTS.md');
    await mkdir(dirname(existing), { recursive: true });
    await writeFile(existing, 'mine');
    await expect(profiles.setup('pi')).rejects.toThrow(existing);
    expect(await readFile(existing, 'utf8')).toBe('mine');
    expect(await readdir(home)).toEqual(['host']);
    await rm(existing);
    await privatePi('0.0.1');
    await expect(profiles.setup('pi')).rejects.toThrow(pi);
    await expect(stat(existing)).rejects.toMatchObject({ code: 'ENOENT' });
    await privatePi(pi, '../../../outside.js');
    await writeFile(join(home, 'runtimes/pi', pi, 'outside.js'), '');
    await expect(profiles.setup('pi')).rejects.toThrow('손상');
  });

  it('rejects redirects into user-owned directories', async () => {
    const external = join(temp, 'existing agent');
    await mkdir(external);
    await mkdir(home);
    await symlink(external, join(home, 'host'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(profiles.setup('pi')).rejects.toThrow(join(home, 'host'));
    expect(await readdir(external)).toEqual([]);
  });
});

it('wires the same resources via real tool-specific flags, with the workspace guard only in safe Pi', async () => {
  const root = '/opt/harness';
  const pi = profiles.resourceArgs('pi', root, true);
  const omp = profiles.resourceArgs('omp', root, true);
  expect(pi).toContain('/opt/harness/config');
  expect(pi).toContain('/opt/harness/extensions/workspace-guard/index.ts');
  expect(omp).toContain('/opt/harness/config');
  expect(omp.slice(0, 2)).toEqual(['--profile', 'mgyoo']);
  let listener;
  protectEnv({ on: (event, callback) => { expect(event).toBe('tool_call'); listener = callback; } });
  for (const path of ['.env', 'cfg/.env.local', 'cfg\\.env', '[.env#ABCD]']) {
    expect(listener({ toolName: 'write', input: { path } })).toMatchObject({ block: true });
  }
  expect(listener({ toolName: 'write', input: { path: '.environment' } })).toBeUndefined();
});
