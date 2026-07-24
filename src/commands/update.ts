import { IMAGE_NAME } from "../constants.js";
import type { RunRequest } from "../process.js";
import { runDoctor } from "./doctor.js";
import type { CommandDeps } from "./types.js";

type DoctorRunner = (
  args: readonly string[],
  deps: CommandDeps,
) => Promise<number>;

async function runSteps(
  requests: readonly RunRequest[],
  deps: CommandDeps,
): Promise<number> {
  for (const request of requests) {
    const code = await deps.runner.run(request);
    if (code !== 0) return code;
  }
  return 0;
}

export async function runUpdate(
  _args: readonly string[],
  deps: CommandDeps,
  doctor: DoctorRunner = runDoctor,
): Promise<number> {
  const status = await deps.runner.capture({
    command: "git",
    args: ["status", "--porcelain"],
    cwd: deps.paths.repositoryRoot,
  });
  if (status.code !== 0 || status.stdout.trim()) {
    deps.stderr.write("업데이트 전 Git 작업 트리가 깨끗해야 합니다.\n");
    return 1;
  }

  const branch = await deps.runner.capture({
    command: "git",
    args: ["branch", "--show-current"],
    cwd: deps.paths.repositoryRoot,
  });
  if (branch.code !== 0 || !branch.stdout.trim()) {
    deps.stderr.write("Detached HEAD에서는 업데이트할 수 없습니다.\n");
    return 1;
  }

  const remote = await deps.runner.capture({
    command: "git",
    args: ["remote", "get-url", "origin"],
    cwd: deps.paths.repositoryRoot,
  });
  if (remote.code !== 0 || !remote.stdout.trim()) {
    deps.stderr.write("origin 원격 저장소가 필요합니다.\n");
    return 1;
  }

  const cwd = deps.paths.repositoryRoot;
  const code = await runSteps(
    [
      { command: "git", args: ["pull", "--ff-only"], cwd },
      { command: "npm", args: ["ci", "--ignore-scripts"], cwd },
      { command: "npm", args: ["run", "check"], cwd },
      { command: "npm", args: ["run", "build"], cwd },
      {
        command: "docker",
        args: [
          "build",
          "-t",
          IMAGE_NAME,
          "-f",
          "container/Dockerfile",
          ".",
        ],
        cwd,
      },
    ],
    deps,
  );
  if (code !== 0) return code;
  return doctor([], deps);
}
