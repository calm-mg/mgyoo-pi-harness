import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { access, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { delimiter, dirname, isAbsolute, join, posix } from 'node:path';
import { HOME, ROOT, TOOLS } from './catalog.mjs';
import { installOmp, ompName, ompTarget } from './omp-release.mjs';

const PI_PACKAGE = '@earendil-works/pi-coding-agent';
const fixedFiles = tool => ['config/AGENTS.md', 'config/package.json', ...(tool === 'omp' ? ['config/omp.yml'] : [])];
const validFile = /^config\/(?:AGENTS\.md|package\.json|omp\.yml|[a-zA-Z0-9_-]+\.js|skills\/[a-z0-9-]+\/SKILL\.md)$/;
const hostDir = tool => join(HOME, 'host', tool);
const agentDir = tool => tool === 'pi' ? join(hostDir(tool), 'agent') : join(hostDir(tool), '.omp', 'profiles', 'mgyoo', 'agent');
const runtimeDir = tool => join(HOME, 'runtimes', tool, TOOLS[tool].version);
const piEntry = root => join(root, 'node_modules', PI_PACKAGE, 'dist', 'cli.js');
const repair = tool => `harness setup ${tool}`;

export function resourceArgs(tool, resourceRoot, safe = false) {
  const path = safe ? posix.join : join;
  const config = path(resourceRoot, 'config');
  // OMP honors package.json#pi.extensions and discovers sibling skills; Pi
  // loads both pi.extensions and pi.skills from this explicitly selected package.
  const args = ['--append-system-prompt', path(config, 'AGENTS.md'), '--extension', config];
  if (tool === 'omp') return ['--profile', 'mgyoo', ...args, '--config', path(config, 'omp.yml')];
  if (safe) args.push('--extension', path(resourceRoot, 'extensions/workspace-guard/index.ts'));
  return args;
}

async function info(path) {
  try { return await lstat(path); }
  catch (err) { if (err.code !== 'ENOENT') throw err; }
}

async function resourceFiles(tool) {
  const result = new Set(fixedFiles(tool));
  const manifest = JSON.parse(await readFile(join(ROOT, 'config/package.json'), 'utf8'));
  for (const hook of manifest.pi.extensions) {
    if (typeof hook !== 'string' || !/^\.\/[a-zA-Z0-9_-]+\.js$/.test(hook)) {
      throw new Error(`config/package.json: hook 경로는 ./이름.js 형식이어야 합니다: ${hook}`);
    }
    result.add(`config/${hook.slice(2)}`);
  }
  const skills = join(ROOT, 'config/skills');
  const skillRoot = await info(skills);
  if (skillRoot && !skillRoot.isDirectory()) throw new Error(`스킬 경로는 일반 디렉터리여야 합니다: ${skills}`);
  for (const entry of skillRoot ? await readdir(skills, { withFileTypes: true }) : []) {
    if (entry.isDirectory() && /^[a-z0-9-]+$/.test(entry.name)) {
      const file = `config/skills/${entry.name}/SKILL.md`;
      if (await info(join(ROOT, file))) result.add(file);
    }
  }
  const paths = [...result].sort();
  for (const file of paths) {
    if (!(await info(join(ROOT, file)))?.isFile()) throw new Error(`일반 리소스 파일이 필요합니다: ${file}`);
  }
  return paths;
}

// Reject directory symlinks/junctions below the state root (e.g. one into ~/.pi).
async function directory(path, create = false) {
  if (path !== HOME) await directory(dirname(path), create);
  const entry = await info(path);
  if (entry && !entry.isDirectory()) throw new Error(`전용 디렉터리가 아닌 경로: ${path}`);
  if (!entry && create) await mkdir(path, { recursive: true, mode: 0o700 });
  return Boolean(entry);
}

async function managedText(path) {
  await directory(dirname(path));
  const entry = await info(path);
  if (!entry) return undefined;
  if (!entry.isFile()) throw new Error(`일반 파일이 아닌 관리 경로: ${path}`);
  return readFile(path, 'utf8');
}

function hostEnv(tool) {
  const env = { ...process.env };
  // Do not attach to a calling agent's profile, daemon, session or configuration.
  for (const key of Object.keys(env)) {
    if (/^(PI_|OMP_)/i.test(key)) delete env[key];
  }
  env.PI_CODING_AGENT_DIR = agentDir(tool);
  if (tool === 'pi') {
    env.PI_TELEMETRY = '0';
  } else {
    const home = hostDir(tool);
    Object.assign(env, {
      HOME: home, USERPROFILE: home, OMP_PROFILE: 'mgyoo', PI_CONFIG_DIR: '.omp',
      XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local', 'share'),
      XDG_STATE_HOME: join(home, '.local', 'state'), XDG_CACHE_HOME: join(home, '.cache'),
    });
  }
  return env;
}

async function matchesOmp(path, expected) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex') === expected;
}

async function runtime(tool) {
  const root = runtimeDir(tool);
  if (await directory(root)) {
    if (tool === 'pi') {
      const manifest = await managedText(join(root, 'node_modules', PI_PACKAGE, 'package.json'));
      let pkg;
      try { pkg = JSON.parse(manifest); } catch { /* Same repair path as a wrong version. */ }
      if (pkg?.name === PI_PACKAGE && pkg.version === TOOLS.pi.version && (await info(piEntry(root)))?.isFile()) {
        return { command: process.execPath, args: [piEntry(root)] };
      }
    } else {
      const exe = join(root, ompName);
      if ((await info(exe))?.isFile() && await matchesOmp(exe, ompTarget().hash)) return { command: exe, args: [] };
    }
    throw new Error(`${root}: ${tool} ${TOOLS[tool].version} 설치가 손상되었거나 다른 버전입니다. 이 디렉터리를 옮긴 뒤 ${repair(tool)} 를 실행하세요.`);
  }
  if (tool === 'omp') {
    const { hash } = ompTarget();
    for (const dir of (process.env.PATH || '').split(delimiter).filter(isAbsolute)) {
      const exe = join(dir, ompName);
      const entry = await info(exe);
      if (!entry) continue;
      try { await access(exe, constants.X_OK); } catch { continue; }
      // Do not trust self-reported versions (legacy harness launchers can start Docker).
      if (entry.isFile() && await matchesOmp(exe, hash)) return { command: exe, args: [] };
      break;
    }
  }
}

async function installPi(root) {
  // Launch the official npm entry with Node, never a .cmd file or a shell.
  const bin = dirname(process.execPath);
  const npm = [join(bin, 'node_modules/npm/bin/npm-cli.js'), join(bin, '../lib/node_modules/npm/bin/npm-cli.js'),
    join(bin, '../share/nodejs/npm/bin/npm-cli.js')];
  if (process.platform !== 'win32' && await info(join(bin, 'npm'))) {
    const sibling = await realpath(join(bin, 'npm'));
    if (sibling.endsWith('/npm/bin/npm-cli.js')) npm.push(sibling);
  }
  let cli;
  for (const path of npm) if (await info(path)) { cli = path; break; }
  if (!cli) throw new Error('Pi 설치에는 npm을 포함한 Node.js 24+ 배포판이 필요합니다: https://nodejs.org/');
  await directory(join(HOME, 'npm-cache'), true);
  const result = spawnSync(process.execPath, [cli, 'install', '--prefix', root, '--global=false', '--no-save', '--package-lock=false',
    '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(HOME, 'npm-cache'), `${PI_PACKAGE}@${TOOLS.pi.version}`],
  { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.error || result.status !== 0) throw new Error(`Pi ${TOOLS.pi.version} npm 설치 실패. npm 레지스트리 연결 및 디스크 권한을 확인하세요. ${result.error?.message || ''}`);
}

async function install(tool) {
  const dest = runtimeDir(tool);
  await directory(dirname(dest), true);
  const stage = await mkdtemp(join(dirname(dest), '.install-'));
  try {
    if (tool === 'pi') await installPi(stage); else await installOmp(stage);
    const command = tool === 'pi' ? process.execPath : join(stage, ompName);
    const args = tool === 'pi' ? [piEntry(stage), '--version'] : ['--version'];
    const probe = spawnSync(command, args, { cwd: stage, env: hostEnv(tool), encoding: 'utf8', timeout: 30_000 });
    const expected = (tool === 'omp' ? 'omp/' : '') + TOOLS[tool].version;
    if (probe.status !== 0 || probe.stdout.trim() !== expected) {
      const hint = tool === 'omp' && process.platform === 'linux' ? ' musl에서는 libstdc++/libgcc도 필요합니다.' : '';
      throw new Error(`${tool} 실행 확인 실패 (기대 버전 ${expected}): ${probe.error?.message || probe.stderr || probe.stdout}.${hint}`);
    }
    await rename(stage, dest);
  } finally { await rm(stage, { recursive: true, force: true }); }
}

const digest = text => createHash('sha256').update(text).digest('hex');
const receiptPath = tool => join(hostDir(tool), 'managed.json');
async function receipt(tool) {
  const path = receiptPath(tool);
  const text = await managedText(path);
  if (text === undefined) return;
  try {
    const record = JSON.parse(text);
    if (record.format === 1 && record.tool === tool && record.files && !Array.isArray(record.files) &&
        typeof record.files === 'object' && fixedFiles(tool).every(f => Object.hasOwn(record.files, f)) &&
        Object.entries(record.files).every(([f, hash]) => validFile.test(f) && (hash === null || /^[0-9a-f]{64}$/.test(hash)))) return record;
  } catch { /* Do not take ownership of an unrecognized file. */ }
  throw new Error(`알 수 없는 관리 기록을 보존합니다: ${path}. 파일을 확인하고 옮긴 뒤 다시 실행하세요.`);
}

async function save(path, content, replace) {
  await directory(dirname(path), true);
  if (!replace) return writeFile(path, content, { flag: 'wx', mode: 0o600 });
  const temp = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temp, content, { flag: 'wx', mode: 0o600 }); await rename(temp, path); }
  finally { await rm(temp, { force: true }); }
}

export async function setup(tool, dryRun = false) {
  const old = await receipt(tool);
  const resources = join(hostDir(tool), 'resources');
  const record = { format: 1, tool, version: TOOLS[tool].version, files: {} };
  const changes = [];
  console.log(`${dryRun ? '[dry-run] ' : ''}${tool} ${TOOLS[tool].version} · 호스트 프로필: ${agentDir(tool)}`);
  for (const file of await resourceFiles(tool)) {
    const path = join(resources, file);
    const wanted = await readFile(join(ROOT, file), 'utf8');
    const existing = await managedText(path);
    const hash = digest(wanted);
    // An identical file present before first setup may be used, but never adopted for replacement.
    record.files[file] = existing !== undefined && !old?.files[file] ? null : hash;
    if (existing === wanted) continue;
    if (existing !== undefined && digest(existing) !== old?.files[file]) {
      throw new Error(`사용자 변경을 보존했습니다: ${path}. 백업하거나 저장소 원본과 병합한 뒤 ${repair(tool)} 를 실행하세요.`);
    }
    changes.push({ path, wanted, previous: existing });
    console.log(`${existing === undefined ? '생성' : '갱신'}: ${path}`);
  }
  for (const [file, hash] of Object.entries(old?.files || {})) {
    if (Object.hasOwn(record.files, file)) continue;
    const path = join(resources, file);
    const previous = await managedText(path);
    if (previous === undefined) continue;
    if (digest(previous) !== hash) throw new Error(`사용자가 관리하는 이전 리소스를 먼저 옮기세요: ${path}`);
    changes.push({ path, previous });
    console.log(`제거: ${path}`);
  }
  const rt = await runtime(tool);
  console.log(rt ? `사용: ${rt.args[0] || rt.command}` : `전용 설치: ${runtimeDir(tool)} (${tool === 'pi' ? 'npm 필요' : '공식 바이너리, SHA-256 검사'})`);
  await directory(agentDir(tool));
  if (dryRun) return;
  if (!rt) await install(tool);
  await directory(agentDir(tool), true);
  for (const { path, wanted, previous } of changes) {
    // The download can take minutes; do not overwrite edits made since preflight.
    if (await managedText(path) !== previous) throw new Error(`설정 중 변경된 파일을 보존했습니다: ${path}`);
    if (wanted === undefined) await rm(path);
    else await save(path, wanted, previous !== undefined);
  }
  if (JSON.stringify(old) !== JSON.stringify(record)) await save(receiptPath(tool), `${JSON.stringify(record, null, 2)}\n`, old !== undefined);
}

export async function hostLaunch(tool) {
  const context = await receipt(tool);
  if (context?.version !== TOOLS[tool].version || !(await directory(agentDir(tool)))) {
    throw new Error(`전용 프로필이 준비되지 않았습니다. ${repair(tool)} 를 실행하세요.`);
  }
  const root = join(hostDir(tool), 'resources');
  for (const file of Object.keys(context.files)) {
    if (await managedText(join(root, file)) === undefined) throw new Error(`관리 파일 없음: ${file}. ${repair(tool)} 를 실행하세요.`);
  }
  const rt = await runtime(tool);
  if (!rt) throw new Error(`${tool} ${TOOLS[tool].version} 실행 파일 없음 또는 버전 불일치. ${repair(tool)} 를 실행하세요.`);
  return { command: rt.command, args: [...rt.args, ...resourceArgs(tool, root)], env: hostEnv(tool) };
}
