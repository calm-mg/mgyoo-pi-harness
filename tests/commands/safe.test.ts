import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSafe } from "../../src/commands/safe.js";
import { buildSafeDockerArgs } from "../../src/docker.js";
import type { RunRequest } from "../../src/process.js";

describe("buildSafeDockerArgs", () => {
  it("mounts only cwd and the named Pi volume", () => {
    const args = buildSafeDockerArgs({
      cwd: "/work/app",
      interactive: true,
      piArgs: ["--model", "openai/example"],
    });

    expect(args).toContain("type=bind,source=/work/app,target=/workspace");
    expect(args).toContain(
      "type=volume,source=mgyoo-pi-safe-agent,target=/root/.pi/agent",
    );
    expect(args.join(" ")).not.toContain("/var/run/docker.sock");
    expect(args.join(" ")).not.toContain("target=/root,");
  });

  it("keeps a Windows cwd in one argv element", () => {
    const args = buildSafeDockerArgs({
      cwd: String.raw`D:\work\app`,
      interactive: false,
      piArgs: [],
    });

    expect(args).toContain(
      String.raw`type=bind,source=D:\work\app,target=/workspace`,
    );
  });
});

describe("runSafe", () => {
  it("canonicalizes cwd and invokes docker without a shell", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mgyoo-safe-"));
    const requests: RunRequest[] = [];

    const code = await runSafe(["--offline"], {
      runner: {
        async run(request) {
          requests.push(request);
          return 0;
        },
      },
      stdout: { write: () => true } as never,
      stderr: { write: () => true } as never,
      cwd,
      paths: {
        repositoryRoot: cwd,
        hostPiExecutable: "pi",
        hostAgentDir: join(cwd, "agent"),
      },
    });

    expect(code).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.command).toBe("docker");
    expect(requests[0]?.args).toContain(
      `type=bind,source=${await realpath(cwd)},target=/workspace`,
    );
  });
});
