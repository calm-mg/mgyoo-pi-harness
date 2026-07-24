import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

function installerRequest(repositoryRoot: string): RunRequest {
  if (process.platform === "win32") {
    return {
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(repositoryRoot, "install.ps1"),
      ],
      cwd: repositoryRoot,
    };
  }
  return {
    command: "sh",
    args: [join(repositoryRoot, "install.sh")],
    cwd: repositoryRoot,
  };
}

async function restorePreviousRevision(
  previousHead: string,
  deps: CommandDeps,
): Promise<void> {
  const cwd = deps.paths.repositoryRoot;
  const recoveryRoot = join(
    tmpdir(),
    `mgyoo-pi-recovery-${randomUUID()}`,
  );
  deps.stderr.write(
    `업데이트 활성화에 실패했습니다. 이전 커밋 ${previousHead}의 detached 복구 worktree를 만듭니다.\n`,
  );
  const worktreeCode = await deps.runner.run({
    command: "git",
    args: ["worktree", "add", "--detach", recoveryRoot, previousHead],
    cwd,
  });
  const installCode =
    worktreeCode === 0
      ? await deps.runner.run(installerRequest(recoveryRoot))
      : worktreeCode;
  if (worktreeCode === 0 && installCode === 0) {
    deps.stderr.write(
      `현재 브랜치는 그대로 두고 이전 버전을 ${recoveryRoot}에서 재활성화했습니다. 새 버전 문제가 해결될 때까지 이 worktree를 보존하세요.\n`,
    );
    return;
  }
  if (worktreeCode === 0) {
    const installer =
      process.platform === "win32"
        ? `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${join(recoveryRoot, "install.ps1")}"`
        : `sh "${join(recoveryRoot, "install.sh")}"`;
    deps.stderr.write(
      `복구 worktree 안의 설치기 실행에 실패했습니다. 현재 브랜치는 그대로 두고 다음 명령을 다시 실행하세요: ${installer}\n`,
    );
    return;
  }
  const fallbackRoot = join(
    tmpdir(),
    `mgyoo-pi-recovery-${randomUUID()}`,
  );
  deps.stderr.write(
    `복구 worktree 생성에 실패했습니다. 현재 브랜치를 변경하지 말고 다음 명령으로 별도 복구본을 만드세요: git worktree add --detach "${fallbackRoot}" ${previousHead}\n`,
  );
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
  const previous = await deps.runner.capture({
    command: "git",
    args: ["rev-parse", "HEAD"],
    cwd,
  });
  const previousHead = previous.stdout.trim();
  if (previous.code !== 0 || !/^[0-9a-f]{6,64}$/i.test(previousHead)) {
    deps.stderr.write("현재 Git 커밋을 확인할 수 없어 업데이트를 중단합니다.\n");
    return 1;
  }

  const pullCode = await runSteps(
    [{ command: "git", args: ["pull", "--ff-only"], cwd }],
    deps,
  );
  if (pullCode !== 0) return pullCode;

  const activationCode = await deps.runner.run(installerRequest(cwd));
  if (activationCode !== 0) {
    await restorePreviousRevision(previousHead, deps);
    return activationCode;
  }

  const doctorCode = await doctor([], deps);
  if (doctorCode !== 0) {
    await restorePreviousRevision(previousHead, deps);
    return doctorCode;
  }
  return 0;
}
