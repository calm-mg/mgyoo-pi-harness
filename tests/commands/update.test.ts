import { describe, expect, it } from "vitest";
import { runUpdate } from "../../src/commands/update.js";
import type {
  CaptureResult,
  ProcessRunner,
  RunRequest,
} from "../../src/process.js";

function createHarness(statusOutput = "") {
  const calls: RunRequest[] = [];
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
      return { code: 0, stdout: "", stderr: "" };
    },
    async run(request) {
      calls.push(request);
      return 0;
    },
  };
  return {
    calls,
    deps: {
      runner,
      stdout: { write: () => true },
      stderr: { write: () => true },
      cwd: process.cwd(),
      paths: {
        repositoryRoot: process.cwd(),
        hostPiExecutable: "pi-cli.js",
        hostAgentDir: "agent",
      },
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
        "git pull --ff-only",
        "npm ci --ignore-scripts",
        "npm run check",
        "npm run build",
        "docker build -t mgyoo-pi-harness:0.82.0 -f container/Dockerfile .",
      ]),
    );
  });
});
