import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { TOOLS } from './catalog.mjs';

export const ompName = process.platform === 'win32' ? 'omp.exe' : 'omp';

// Official release manifest: https://build.stencil.so/api/products/omp/versions/19.0.1/macos-arm64
// Pin bytes as well as the version. An unknown PATH wrapper is never executed to identify it.
const ompBuilds = {
  '19.0.1': {
    'macos-arm64': '2fe420bbd00f81899816e51cbeeb9593afa59d9368d62c9d3e78535d540e32f6',
    'macos-x86_64': '8d62502eede8c7a43311798434d0a31a1c024a3abc56bedc4da200cccf94fea1',
    'linux-arm64': '237ede0f4994d61f523802c4cf562d4e48bae74c188add792d06d051b907cecf',
    'linux-x86_64': '6ceef04430851bb1050c6fda3af467412eb44a11df0a6ff8121fe601013c5415',
    'linux-musl-arm64': '69fda114c77a0c146b916ab76047ca603c00fa69068627f5b9ba52f9662636a0',
    'linux-musl-x86_64': '6cb67da8e3c8374ec4a12df1b5c65646492c2cb139fa4d2c02b0f6ec5ce9da61',
    'windows-arm64': '4e8c80471055916634874a37b5e2f8f0110c469153ae7ac6fc53b932dc650f4b',
    'windows-x86_64': 'ebc8cc11f1539034a013a59e7bcb9cdca46eb14c86a6fe0cf5939a184fc31c52',
  },
};

export function ompTarget() {
  let os = { win32: 'windows', darwin: 'macos', linux: 'linux' }[process.platform];
  if (os === 'linux' && !process.report.getReport().header.glibcVersionRuntime) os = 'linux-musl';
  const target = `${os}-${process.arch === 'x64' ? 'x86_64' : process.arch}`;
  const hash = ompBuilds[TOOLS.omp.version]?.[target];
  if (!hash) throw new Error(`지원하는 OMP 바이너리가 없습니다: ${process.platform}/${process.arch}, ${TOOLS.omp.version}`);
  return { target, hash };
}

export async function installOmp(root) {
  const { target, hash } = ompTarget();
  const version = TOOLS.omp.version;
  const endpoint = `https://build.stencil.so/api/products/omp/versions/${version}/${target}`;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const release = await response.json();
    if (release.build?.version !== version || release.file?.sha256 !== hash || !release.download?.startsWith('https://')) {
      throw new Error('공식 릴리스 정보가 고정 버전/해시와 일치하지 않습니다');
    }
    const download = await fetch(release.download, { signal: AbortSignal.timeout(900_000) });
    if (!download.ok || !download.body) throw new Error(`HTTP ${download.status}`);
    const digest = createHash('sha256');
    const checksum = new Transform({ transform(chunk, encoding, done) { digest.update(chunk); done(null, chunk); } });
    await pipeline(download.body, checksum, createWriteStream(join(root, ompName), { flags: 'wx', mode: 0o755 }));
    if (digest.digest('hex') !== hash) throw new Error('SHA-256 불일치');
  } catch (err) { throw new Error(`OMP 다운로드 실패 (${endpoint}): ${err.message}`); }
}
