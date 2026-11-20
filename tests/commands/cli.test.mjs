import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const cli = fileURLToPath(new URL('../../lib/cli.mjs', import.meta.url));

it('reports a missing Docker CLI, without offering an implicit host launch', () => {
  const root = mkdtempSync(join(tmpdir(), 'harness-cli-'));
  try {
    const workspace = join(root, 'project');
    mkdirSync(workspace);
    // Windows TEMP is normally inside the real user's protected AppData.
    const home = join(root, 'home');
    mkdirSync(home);
    const env = { ...process.env, HOME: home, USERPROFILE: home, MGYOO_HARNESS_HOME: join(root, 'state') };
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
    env.PATH = root;
    const result = spawnSync(process.execPath, [cli, 'run', 'omp'], { cwd: workspace, env, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Docker CLI를 찾을 수 없습니다');
    expect(result.stderr).not.toContain('[host]');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
