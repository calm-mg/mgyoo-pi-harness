import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("safe container", () => {
  it("pins Node and Pi and does not expose the Docker socket", async () => {
    const dockerfile = await readFile("container/Dockerfile", "utf8");

    expect(dockerfile).toContain("FROM node:24-bookworm-slim");
    expect(dockerfile).toContain(
      "@earendil-works/pi-coding-agent@0.82.0",
    );
    expect(dockerfile).not.toContain("/var/run/docker.sock");
  });

  it("seeds managed files without overwriting auth", async () => {
    const entrypoint = await readFile("container/entrypoint.sh", "utf8");

    expect(entrypoint).toContain("settings.json");
    expect(entrypoint).toContain("workspace-guard");
    expect(entrypoint).toContain("APPEND_SYSTEM.md");
    expect(entrypoint).not.toContain("auth.json");
    expect(entrypoint).not.toContain("rm -rf");
  });
});
