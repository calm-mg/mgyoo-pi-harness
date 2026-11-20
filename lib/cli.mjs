#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { TOOLS } from './catalog.mjs';

const usage = `사용법:
  harness setup  <pi|omp> [--dry-run]          전용 호스트 환경 설치 (Docker 불필요)
  harness run    <pi|omp> [--host] [-- 인수…]  기본: 현재 디렉터리를 Docker에서 실행
  harness doctor <pi|omp> [--host]             선택한 실행 환경 진단

호스트 실행은 현재 사용자 권한을 사용합니다. 안전 모드 실패 시 호스트로 전환하지 않습니다.`;

async function main([action, tool, ...args]) {
  if (Number(process.versions.node.split('.')[0]) < 24) {
    throw new Error('Node.js 24 이상이 필요합니다. https://nodejs.org/ 에서 설치 후 다시 실행하세요.');
  }
  if (action === undefined || action === '--help' || action === '-h') {
    console.log(usage);
    return 0;
  }
  const end = args.indexOf('--');
  const flags = end < 0 ? args : args.slice(0, end);
  const forwarded = end < 0 ? [] : args.slice(end + 1);
  if (!Object.hasOwn(TOOLS, tool) || !['setup', 'run', 'doctor'].includes(action) ||
      (end >= 0 && action !== 'run') || flags.length > 1 ||
      (flags.length && flags[0] !== (action === 'setup' ? '--dry-run' : '--host'))) {
    console.error(usage);
    return 2;
  }
  if (action === 'setup') {
    const { setup } = await import('./profiles.mjs');
    await setup(tool, flags[0] === '--dry-run');
    return 0;
  }
  if (flags[0] !== '--host') {
    const { safeDoctor, safeRun } = await import('./sandbox.mjs');
    return action === 'doctor' ? safeDoctor(tool) : safeRun(tool, forwarded);
  }
  const { hostLaunch } = await import('./profiles.mjs');
  const launch = await hostLaunch(tool);
  if (action === 'doctor') {
    console.log(`OK: ${tool} ${TOOLS[tool].version} 호스트 환경\n프로필: ${launch.env.PI_CODING_AGENT_DIR}\nDocker는 사용하지 않습니다.`);
    return 0;
  }
  console.error(`[host] ${tool}: ${process.cwd()} · 현재 사용자 권한 (Docker 격리 없음)`);
  return new Promise((resolve, reject) => {
    const child = spawn(launch.command, [...launch.args, ...forwarded], { env: launch.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 1)));
  });
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`harness: ${error.message}`);
  process.exitCode = 1;
}
