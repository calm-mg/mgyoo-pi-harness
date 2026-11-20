import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const HOME = resolve(process.env.MGYOO_HARNESS_HOME || join(homedir(), '.mgyoo-harness'));
export const TOOLS = { pi: { version: '0.82.0' }, omp: { version: '19.0.1' } };
