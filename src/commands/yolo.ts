import type { CommandDeps } from "./types.js";

export async function runYolo(
  args: readonly string[],
  deps: CommandDeps,
): Promise<number> {
  deps.stdout.write(
    [
      "=== YOLO MODE ===",
      `cwd: ${deps.cwd}`,
      "Pi is running with host permissions.",
      "Press Ctrl+C to stop.",
      "",
    ].join("\n"),
  );

  return deps.runner.run({
    command: process.execPath,
    args: [deps.paths.hostPiExecutable, ...args],
    cwd: deps.cwd,
  });
}
