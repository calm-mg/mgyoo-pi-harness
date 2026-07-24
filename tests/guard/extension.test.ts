import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import registerGuard from "../../extensions/workspace-guard/index.js";

type Handler = (
  event: Record<string, unknown>,
  context: Record<string, unknown>,
) => Promise<unknown> | unknown;

function createHarness() {
  const handlers = new Map<string, Handler>();
  const pi = {
    on: vi.fn((name: string, callback: Handler) => {
      handlers.set(name, callback);
    }),
  };
  registerGuard(pi as never);
  return { handlers, pi };
}

describe("workspace guard extension", () => {
  it("blocks an edit outside cwd", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-extension-"));
    const { handlers } = createHarness();

    const result = await handlers.get("tool_call")!(
      { toolName: "edit", input: { path: "../outside.txt", edits: [] } },
      { cwd: workspace },
    );

    expect(result).toEqual({
      block: true,
      reason: "Path escapes the workspace",
    });
  });

  it("blocks reading a protected secret", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-extension-"));
    const { handlers } = createHarness();

    const result = await handlers.get("tool_call")!(
      { toolName: "read", input: { path: ".env" } },
      { cwd: workspace },
    );

    expect(result).toEqual({
      block: true,
      reason: "Secret files are protected",
    });
  });

  it("allows a write below cwd", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-extension-"));
    const { handlers } = createHarness();

    const result = await handlers.get("tool_call")!(
      { toolName: "write", input: { path: "src/app.ts", content: "" } },
      { cwd: workspace },
    );

    expect(result).toBeUndefined();
  });

  it("blocks dangerous bash", async () => {
    const { handlers } = createHarness();

    const result = await handlers.get("tool_call")!(
      { toolName: "bash", input: { command: "sudo apt update" } },
      { cwd: process.cwd() },
    );

    expect(result).toEqual({
      block: true,
      reason: "Privilege escalation is disabled in safe mode",
    });
  });

  it("shows a visible safe-mode status", async () => {
    const setStatus = vi.fn();
    const { handlers } = createHarness();

    await handlers.get("session_start")!({}, { ui: { setStatus } });

    expect(setStatus).toHaveBeenCalledWith(
      "mgyoo-safe",
      "SAFE · workspace only",
    );
  });
});
