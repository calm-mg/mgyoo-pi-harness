import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PI_PACKAGE, TOOLS } from '../../lib/catalog.mjs';

const json = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const pkg = json('package.json');
const lock = json('package-lock.json');

it('types and tests the same Pi release that host setup and the image install', () => {
  expect(TOOLS.pi.version).toBe(pkg.devDependencies[PI_PACKAGE]);
  expect(lock.packages[''].devDependencies[PI_PACKAGE]).toBe(TOOLS.pi.version);
  expect(lock.packages[`node_modules/${PI_PACKAGE}`].version).toBe(TOOLS.pi.version);
  // npm ci installed this copy; typecheck resolved the extension API from it.
  expect(json(`node_modules/${PI_PACKAGE}/package.json`).version).toBe(TOOLS.pi.version);
});

it('keeps Node types and CI on the minimum supported Node major', () => {
  const minimum = pkg.engines.node.match(/^>=(\d+)$/)[1];
  expect(pkg.devDependencies['@types/node'].split('.')[0]).toBe(minimum);
  const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  expect([...ci.matchAll(/node-version: "(\d+)"/g)].map(m => m[1])).toEqual(expect.arrayContaining([minimum]));
});

it('points current documentation at the pinned Pi release', () => {
  const docs = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md'].map(file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')).join('\n');
  for (const pattern of [/earendil-works\/pi\/(?:blob|tree)\/v([\d.]+)\//g, /pi-coding-agent@([\d.]+\d)/g]) {
    const found = [...docs.matchAll(pattern)].map(m => m[1]);
    expect(found.length, String(pattern)).toBeGreaterThan(0);
    expect(new Set(found), String(pattern)).toEqual(new Set([TOOLS.pi.version]));
  }
});
