import { realpath } from "node:fs/promises";
import { buildSafeDockerArgs } from "../docker.js";
import type { CommandDeps } from "./types.js";

function validateMountSource(path: string): void {
  if (path.includes("\0") || path.includes("\n") || path.includes("\r")) {
    throw new Error("The workspace path contains unsupported characters.");
  }
}

export async function runSafe(
  args: readonly string[],
  deps: CommandDeps,
): Promise<number> {
  const cwd = await realpath(deps.cwd);
  validateMountSource(cwd);
  return deps.runner.run({
    command: "docker",
    args: buildSafeDockerArgs({
      cwd,
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      piArgs: args,
    }),
    cwd,
  });
}
