import { IMAGE_NAME, SAFE_VOLUME } from "../constants.js";
import { buildSafeLoginDockerArgs } from "../docker.js";
import type { CommandDeps } from "./types.js";

export async function runLogin(
  mode: string | undefined,
  deps: CommandDeps,
): Promise<number> {
  if (mode === "safe") {
    deps.stdout.write("Pi가 열리면 `/login`을 입력하세요.\n");
    return deps.runner.run({
      command: "docker",
      args: buildSafeLoginDockerArgs(
        Boolean(process.stdin.isTTY && process.stdout.isTTY),
      ),
    });
  }

  if (mode === "yolo") {
    deps.stdout.write("Pi가 열리면 `/login`을 입력하세요.\n");
    return deps.runner.run({
      command: process.execPath,
      args: [deps.paths.hostPiExecutable],
      cwd: deps.cwd,
    });
  }

  deps.stderr.write(
    `로그인 모드는 safe 또는 yolo여야 합니다. (${IMAGE_NAME}, ${SAFE_VOLUME})\n`,
  );
  return 2;
}
