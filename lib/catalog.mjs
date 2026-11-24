import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OMP_VERSION } from './omp-release.mjs';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const HOME = resolve(process.env.MGYOO_HARNESS_HOME || join(homedir(), '.mgyoo-harness'));
export const PI_PACKAGE = '@earendil-works/pi-coding-agent';

// The exact devDependency is the only Pi pin: Dependabot updates it with the
// lockfile, and host setup, the image and the extension types follow it.
const piVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).devDependencies?.[PI_PACKAGE];
if (!/^\d+\.\d+\.\d+$/.test(piVersion ?? '')) throw new Error(`package.json: ${PI_PACKAGE}는 정확한 릴리스 버전이어야 합니다: ${piVersion}`);
export const TOOLS = { pi: { version: piVersion }, omp: { version: OMP_VERSION } };
