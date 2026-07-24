import { realpath } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

export interface PathCheckInput {
  workspace: string;
  candidate: string;
}

export type PathDecision =
  | { allowed: true; absolutePath: string }
  | { allowed: false; reason: string };

const secretNames = new Set([".env", "id_rsa", "id_ed25519"]);

function isSecretPath(path: string): boolean {
  const name = basename(path).toLowerCase();
  return (
    secretNames.has(name) ||
    name.startsWith(".env.") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}

async function canonicalizeNewPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    const parent = dirname(path);
    if (parent === path) return resolve(path);
    return resolve(await canonicalizeNewPath(parent), basename(path));
  }
}

function isContained(workspace: string, candidate: string): boolean {
  const rel = relative(workspace, candidate);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}

export async function classifyPath(
  input: PathCheckInput,
): Promise<PathDecision> {
  const workspace = await realpath(input.workspace);
  const absolute = resolve(workspace, input.candidate);

  if (isSecretPath(absolute)) {
    return { allowed: false, reason: "Secret files are protected" };
  }

  const canonical = await canonicalizeNewPath(absolute);
  if (!isContained(workspace, canonical)) {
    return { allowed: false, reason: "Path escapes the workspace" };
  }

  return { allowed: true, absolutePath: canonical };
}
