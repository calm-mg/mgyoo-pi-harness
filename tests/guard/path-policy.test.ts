import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyPath } from "../../extensions/workspace-guard/path-policy.js";

describe("classifyPath", () => {
  it("allows a normal file below the workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));

    await expect(
      classifyPath({ workspace, candidate: "src/app.ts" }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("blocks parent traversal", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));

    await expect(
      classifyPath({ workspace, candidate: "../outside.txt" }),
    ).resolves.toEqual({
      allowed: false,
      reason: "Path escapes the workspace",
    });
  });

  it("blocks an absolute path outside the workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
    const outside = join(
      await mkdtemp(join(tmpdir(), "mgyoo-outside-")),
      "x.txt",
    );

    await expect(
      classifyPath({ workspace, candidate: outside }),
    ).resolves.toEqual({
      allowed: false,
      reason: "Path escapes the workspace",
    });
  });

  it("blocks a symlink that resolves outside", async () => {
    const root = await mkdtemp(join(tmpdir(), "mgyoo-root-"));
    const workspace = join(root, "workspace");
    const outside = join(root, "outside");
    await mkdir(workspace);
    await mkdir(outside);
    await writeFile(join(outside, "secret.txt"), "secret");
    await symlink(
      outside,
      join(workspace, "link"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(
      classifyPath({ workspace, candidate: "link/secret.txt" }),
    ).resolves.toEqual({
      allowed: false,
      reason: "Path escapes the workspace",
    });
  });

  it.each([".env", ".env.local", "id_rsa", "client.pem", "private.key"])(
    "blocks secret path %s",
    async (candidate) => {
      const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));

      await expect(
        classifyPath({ workspace, candidate }),
      ).resolves.toEqual({
        allowed: false,
        reason: "Secret files are protected",
      });
    },
  );

  it("does not treat env.example as a secret", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));

    await expect(
      classifyPath({ workspace, candidate: "env.example" }),
    ).resolves.toMatchObject({ allowed: true });
  });
});
