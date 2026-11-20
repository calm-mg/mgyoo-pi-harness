import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { globSync, readFileSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, sep } from 'node:path';
import { HOME, ROOT, TOOLS } from './catalog.mjs';
import { resourceArgs } from './profiles.mjs';

const revisionLabel = 'io.mgyoo.harness.inputs';

// Resolve existing ancestors even before setup has created the state directory.
function physical(path) {
  try { return realpathSync.native(path); } catch (error) {
    if (error.code !== 'ENOENT' || dirname(path) === path) throw error;
    return join(physical(dirname(path)), basename(path));
  }
}

function contains(parent, path) {
  const rel = relative(parent, path);
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`);
}

function workspace() {
  const cwd = realpathSync.native(process.cwd());
  const home = physical(homedir());
  const privateDirs = [HOME, ...['.ssh', '.gnupg', '.config', '.docker', '.pi', '.omp', '.aws', '.kube', '.azure', 'Library', 'AppData'].map(p => join(home, p))];
  if (process.platform === 'win32') {
    privateDirs.push(...[process.env.SystemRoot, process.env.ProgramData, process.env.ProgramFiles].filter(Boolean));
  } else {
    privateDirs.push('/etc', '/proc', '/sys', '/dev', '/run', '/var/run', '/var/lib/docker', '/boot', '/System', '/Library');
  }
  const broad = cwd === parse(cwd).root || contains(cwd, home) || contains(cwd, physical(tmpdir()));
  if (broad || /[\r\n]/.test(cwd) || privateDirs.some(p => {
    const dir = physical(p);
    return contains(cwd, dir) || contains(dir, cwd);
  })) {
    throw new Error(`안전 모드에서 이 경로를 마운트할 수 없습니다: ${cwd}. 홈·시스템·하네스 상태와 분리된 프로젝트 디렉터리로 이동하세요.`);
  }
  return cwd;
}

function docker(args, options = {}) {
  const result = spawnSync('docker', args, { cwd: ROOT, encoding: 'utf8', ...options });
  if (result.error?.code === 'ENOENT') throw new Error('Docker CLI를 찾을 수 없습니다. Docker Desktop 또는 Docker Engine과 CLI를 설치하고 PATH를 확인하세요.');
  if (result.error) throw result.error;
  return result;
}

function connection() {
  const ctx = docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']);
  if (ctx.status !== 0) throw new Error(`Docker 컨텍스트를 확인하세요 (docker context ls): ${ctx.stderr.trim()}`);
  const endpoint = (!process.env.DOCKER_CONTEXT && process.env.DOCKER_HOST) || ctx.stdout.trim();
  if (!endpoint.startsWith('unix:///') && !/^npipe:\/{4}\.\/pipe\//i.test(endpoint)) {
    throw new Error(`원격 Docker 엔진에는 현재 프로젝트를 연결할 수 없습니다. docker context use 로 로컬 컨텍스트를 선택하고 DOCKER_HOST를 확인하세요.`);
  }
  const env = { ...process.env, DOCKER_CONTEXT: '', DOCKER_HOST: endpoint };
  const daemon = docker(['version', '--format', '{{.Client.Version}} {{.Server.Os}}'], { env });
  if (daemon.status !== 0) throw new Error(`Docker 데몬에 연결할 수 없습니다. Docker Desktop 또는 Docker 서비스를 시작한 뒤 docker info를 확인하세요. ${daemon.stderr.trim()}`);
  const [version, os] = daemon.stdout.trim().split(/\s+/);
  if (os !== 'linux') throw new Error('Docker Desktop을 Linux 컨테이너 모드로 전환하세요.');
  return { env, bindOption: Number.parseInt(version, 10) >= 25 ? 'bind-recursive=disabled' : 'bind-nonrecursive' };
}

function image(tool) {
  const version = TOOLS[tool].version;
  const tag = `mgyoo-harness-${tool}:${version}`;
  // .dockerignore doubles as the inventory: deny everything, then allow file
  // globs (not whole directories). Hash precisely those build inputs.
  const inventory = readFileSync(join(ROOT, '.dockerignore'), 'utf8');
  const hash = createHash('sha256').update(version).update(inventory);
  const globs = inventory.split(/\r?\n/).filter(line => line.startsWith('!')).map(line => line.slice(1));
  for (const path of globSync(globs, { cwd: ROOT }).sort()) {
    hash.update(path).update('\0').update(createHash('sha256').update(readFileSync(join(ROOT, path))).digest());
  }
  const namespace = createHash('sha256').update(physical(HOME)).digest('hex').slice(0, 16);
  return { version, tag, revision: hash.digest('hex'), volume: `mgyoo-harness-${tool}-${namespace}` };
}

// image ls returns success with empty stdout when the image is not built yet;
// unlike inspect it doesn't confuse a missing image with an engine error.
function currentId(spec, env) {
  const result = docker(['image', 'ls', '--quiet', '--no-trunc', '--filter', `reference=${spec.tag}`, '--filter', `label=${revisionLabel}=${spec.revision}`], { env });
  if (result.status !== 0) throw new Error(`Docker 이미지 조회 실패: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

export function safeDoctor(tool) {
  try {
    const { env } = connection();
    const spec = image(tool);
    const ready = Boolean(currentId(spec, env));
    console.log(`OK: Docker (Linux), ${spec.tag}: ${ready ? '준비됨' : '최초 실행 또는 변경 후 자동 빌드 예정'}. 전용 상태 볼륨: ${spec.volume}`);
    return 0;
  } catch (error) {
    console.error(`harness: ${error.message}`);
    return 1;
  }
}

export function safeRun(tool, args) {
  try {
    const cwd = workspace();
    const { env, bindOption } = connection();
    const spec = image(tool);
    let id = currentId(spec, env);
    if (!id) {
      console.error(`[safe] ${spec.tag} 빌드 (처음에는 인터넷 연결이 필요합니다)…`);
      const build = docker(['build', '--quiet', '--file', join(ROOT, 'container', 'Dockerfile'), '--build-arg', `TOOL=${tool}`, '--build-arg', `VERSION=${spec.version}`, '--label', `${revisionLabel}=${spec.revision}`, '--tag', spec.tag, ROOT], { env, stdio: ['ignore', 'pipe', 'inherit'] });
      if (build.status !== 0) throw new Error(`이미지 빌드 실패: Docker 빌더와 레지스트리·패키지 다운로드 연결을 확인하세요. 호스트 도구는 실행하지 않습니다.`);
      id = build.stdout.trim();
    }
    // Docker parses --mount as CSV independently of shell escaping.
    const bind = `type=bind,"source=${cwd.replaceAll('"', '""')}",target=/workspace,${bindOption}`;
    const uid = process.getuid?.();
    const identity = uid ? ['--env', `HARNESS_UID=${uid}`, '--env', `HARNESS_GID=${process.getgid()}`] : [];
    // Docker client proxy defaults may contain host credentials. Empty values
    // explicitly override them rather than forwarding any host environment.
    const proxies = ['http_proxy', 'https_proxy', 'ftp_proxy', 'all_proxy', 'no_proxy'].flatMap(key => ['--env', `${key}=`, '--env', `${key.toUpperCase()}=`]);
    console.error(`[safe] ${tool} · ${cwd} → /workspace · Docker 볼륨 ${spec.volume}`);
    const run = docker([
      'run', '--rm', '--interactive', ...(process.stdin.isTTY && process.stdout.isTTY ? ['--tty'] : []),
      '--read-only', '--tmpfs', '/tmp:rw,exec,nosuid,nodev,mode=1777',
      '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'SETUID', '--cap-add', 'SETGID',
      '--security-opt', 'no-new-privileges', ...identity, ...proxies,
      '--mount', bind, '--mount', `type=volume,source=${spec.volume},target=/state,volume-nocopy`,
      id, ...resourceArgs(tool, '/opt/harness', true), ...args,
    ], { env, stdio: 'inherit' });
    return run.status ?? (run.signal === 'SIGINT' ? 130 : 1);
  } catch (error) {
    console.error(`harness: ${error.message}`);
    return 1;
  }
}
