import { describe, expect, it } from "vitest";
import { runUpdate } from "../../src/commands/update.js";
import type {
  CaptureResult,
  ProcessRunner,
  RunRequest,
} from "../../src/process.js";

function createHarness(
  statusOutput = "",
  failCommand = "",
  failEveryMatch = false,
) {
  const calls: RunRequest[] = [];
  let failureUsed = false;
  let stderr = "";
  const runner: ProcessRunner = {
    async capture(request): Promise<CaptureResult> {
      calls.push(request);
      if (request.args.join(" ") === "status --porcelain") {
        return { code: 0, stdout: statusOutput, stderr: "" };
      }
      if (request.args.join(" ") === "branch --show-current") {
        return { code: 0, stdout: "feat/pi-harness-v1\n", stderr: "" };
      }
      if (request.args.join(" ") === "remote get-url origin") {
        return { code: 0, stdout: "https://github.com/example/repo\n", stderr: "" };
      }
      if (request.args.join(" ") === "rev-parse HEAD") {
        return { code: 0, stdout: "abc123\n", stderr: "" };
      }
      return { code: 0, stdout: "", stderr: "" };
    },
    async run(request) {
      calls.push(request);
      const rendered = `${request.command} ${request.args.join(" ")}`;
      if (
        failCommand &&
        rendered.includes(failCommand) &&
        (failEveryMatch || !failureUsed)
      ) {
        failureUsed = true;
        return 17;
      }
      return 0;
    },
  };
  return {
    calls,
    deps: {
      runner,
      stdout: { write: () => true },
      stderr: { write: (text: string) => ((stderr += text), true) },
      cwd: process.cwd(),
      paths: {
        repositoryRoot: process.cwd(),
        hostPiExecutable: "pi-cli.js",
        hostAgentDir: "agent",
      },
    },
    get stderr() {
      return stderr;
    },
  };
}

describe("runUpdate", () => {
  it("stops before mutation when the worktree is dirty", async () => {
    const harness = createHarness(" M README.md\n");

    expect(await runUpdate([], harness.deps, async () => 0)).toBe(1);
    expect(harness.calls.map((call) => call.args.join(" "))).toEqual([
      "status --porcelain",
    ]);
  });

  it("runs a fast-forward-only verified update", async () => {
    const harness = createHarness();

    expect(await runUpdate([], harness.deps, async () => 0)).toBe(0);

    expect(
      harness.calls.map((call) => `${call.command} ${call.args.join(" ")}`),
    ).toEqual(
      expect.arrayContaining([
        "git status --porcelain",
        "git branch --show-current",
        "git remote get-url origin",
        "git rev-parse HEAD",
        "git pull --ff-only",
      ]),
    );
  });

  it("rolls back and reinstalls the previous revision when activation fails", async () => {
    const harness = createHarness("", "install.");

    expect(await runUpdate([], harness.deps, async () => 0)).toBe(17);

    const rendered = harness.calls.map(
      (call) => `${call.command} ${call.args.join(" ")}`,
    );
    expect(
      rendered.some((command) =>
        command.startsWith("git worktree add --detach "),
      ),
    ).toBe(true);
    expect(rendered.join("\n")).not.toContain("git reset --hard");
    expect(
      rendered.filter((command) => command.includes("install.")).length,
    ).toBe(2);
    expect(harness.stderr).toContain("abc123");
    expect(harness.stderr).toContain("worktree");
    expect(harness.stderr).toContain("복구");
  });

  it("recommends rerunning an existing recovery installer when reactivation fails", async () => {
    const harness = createHarness("", "install.", true);

    expect(await runUpdate([], harness.deps, async () => 0)).toBe(17);

    expect(harness.stderr).toContain("복구 worktree 안의 설치기");
    expect(harness.stderr).not.toContain("git worktree add");
  });
});
