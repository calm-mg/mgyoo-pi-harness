import { describe, expect, it } from "vitest";
import { runYolo } from "../../src/commands/yolo.js";
import type { RunRequest } from "../../src/process.js";

describe("runYolo", () => {
  it("warns and invokes the repository-local host Pi", async () => {
    const requests: RunRequest[] = [];
    let output = "";

    const code = await runYolo(["--offline"], {
      runner: {
        async run(request) {
          requests.push(request);
          return 7;
        },
        async capture() {
          return { code: 0, stdout: "", stderr: "" };
        },
      },
      stdout: { write: (chunk: string) => (output += chunk) } as never,
      stderr: { write: () => true } as never,
      cwd: "D:\\work\\app",
      paths: {
        repositoryRoot: "D:\\harness",
        hostPiExecutable:
          "D:\\harness\\node_modules\\@earendil-works\\pi-coding-agent\\dist\\cli.js",
        hostAgentDir: "C:\\Users\\user\\.pi\\agent",
      },
    });

    expect(code).toBe(7);
    expect(output).toContain("YOLO");
    expect(output).toContain("D:\\work\\app");
    expect(output).toContain("host permissions");
    expect(requests).toEqual([
      {
        command: process.execPath,
        args: [
          "D:\\harness\\node_modules\\@earendil-works\\pi-coding-agent\\dist\\cli.js",
          "--offline",
        ],
        cwd: "D:\\work\\app",
      },
    ]);
  });
});
