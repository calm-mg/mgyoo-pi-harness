import { describe, expect, it } from "vitest";
import { runLogin } from "../../src/commands/login.js";
import type { RunRequest } from "../../src/process.js";

function createDeps() {
  const requests: RunRequest[] = [];
  let output = "";
  let error = "";
  return {
    requests,
    readOutput: () => output,
    readError: () => error,
    deps: {
      runner: {
        async run(request: RunRequest) {
          requests.push(request);
          return 0;
        },
        async capture() {
          return { code: 0, stdout: "", stderr: "" };
        },
      },
      stdout: { write: (chunk: string) => (output += chunk) } as never,
      stderr: { write: (chunk: string) => (error += chunk) } as never,
      cwd: "D:\\work\\app",
      paths: {
        repositoryRoot: "D:\\harness",
        hostPiExecutable:
          "D:\\harness\\node_modules\\@earendil-works\\pi-coding-agent\\dist\\cli.js",
        hostAgentDir: "C:\\Users\\user\\.pi\\agent",
      },
    },
  };
}

describe("runLogin", () => {
  it("uses only the safe named volume for safe login", async () => {
    const harness = createDeps();

    expect(await runLogin("safe", harness.deps)).toBe(0);
    expect(harness.readOutput()).toContain("/login");
    expect(harness.requests[0]?.command).toBe("docker");
    expect(harness.requests[0]?.args).toContain(
      "type=volume,source=mgyoo-pi-safe-agent,target=/pi-agent",
    );
    expect(harness.requests[0]?.args.join(" ")).not.toContain("type=bind");
  });

  it("uses host Pi for yolo login", async () => {
    const harness = createDeps();

    expect(await runLogin("yolo", harness.deps)).toBe(0);
    expect(harness.readOutput()).toContain("/login");
    expect(harness.requests[0]).toEqual({
      command: process.execPath,
      args: [
        "D:\\harness\\node_modules\\@earendil-works\\pi-coding-agent\\dist\\cli.js",
      ],
      cwd: "D:\\work\\app",
    });
  });

  it("rejects an unknown login mode without spawning", async () => {
    const harness = createDeps();

    expect(await runLogin("other", harness.deps)).toBe(2);
    expect(harness.readError()).toContain("safe 또는 yolo");
    expect(harness.requests).toEqual([]);
  });
});
