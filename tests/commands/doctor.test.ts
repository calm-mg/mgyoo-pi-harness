import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectDoctorResults,
  type CheckResult,
} from "../../src/commands/doctor.js";
import type { CaptureResult, RunRequest } from "../../src/process.js";

async function createDeps(
  capture: (request: RunRequest) => Promise<CaptureResult>,
) {
  const root = join(tmpdir(), `mgyoo-doctor-${Date.now()}-${Math.random()}`);
  const piCli = join(root, "node_modules", "pi", "cli.js");
  await mkdir(join(root, "node_modules", "pi"), { recursive: true });
  await writeFile(piCli, "");
  return {
    runner: {
      async run() {
        return 0;
      },
      capture,
    },
    stdout: { write: () => true },
    stderr: { write: () => true },
    cwd: root,
    paths: {
      repositoryRoot: process.cwd(),
      hostPiExecutable: piCli,
      hostAgentDir: join(root, "agent"),
    },
  };
}

describe("collectDoctorResults", () => {
  it("returns the stable diagnostic check order", async () => {
    const deps = await createDeps(async () => ({
      code: 0,
      stdout: "ok",
      stderr: "",
    }));

    const results = await collectDoctorResults(deps);

    expect(results.map((result) => result.id)).toEqual([
      "git",
      "node",
      "docker-cli",
      "docker-daemon",
      "pi-host",
      "pi-image",
      "safe-volume",
      "settings",
      "safe-boundary",
    ]);
  });

  it("reports a Docker daemon remedy without environment data", async () => {
    const deps = await createDeps(async (request) => ({
      code:
        request.command === "docker" && request.args[0] === "info" ? 1 : 0,
      stdout: "",
      stderr: "daemon unavailable",
    }));

    const results = await collectDoctorResults(deps);
    const daemon = results.find(
      (result): result is CheckResult => result.id === "docker-daemon",
    );

    expect(daemon).toMatchObject({ status: "fail" });
    expect(daemon?.remedy).toContain("docs.docker.com");
    expect(JSON.stringify(results)).not.toContain("process.env");
  });

  it("does not print Docker image environment data", async () => {
    const deps = await createDeps(async (request) => ({
      code: 0,
      stdout:
        request.command === "docker" && request.args[0] === "image"
          ? '{"Config":{"Env":["EXAMPLE_SECRET=hidden-value"]}}'
          : "ok",
      stderr: "",
    }));

    const results = await collectDoctorResults(deps);
    const image = results.find((result) => result.id === "pi-image");

    expect(image?.summary).toBe("Pinned safe image is present");
    expect(JSON.stringify(results)).not.toContain("hidden-value");
  });
});
