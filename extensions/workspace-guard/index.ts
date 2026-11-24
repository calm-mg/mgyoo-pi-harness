import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { classifyCommand } from "./command-policy.js";
import { classifyPath } from "./path-policy.js";

// The image contains these public documents on its read-only root. Never
// admit a directory, symlink, workspace-relative spelling or write operation.
const skills = fileURLToPath(new URL("../../config/skills", import.meta.url));
const skillDirs = lstatSync(skills, { throwIfNoEntry: false })?.isDirectory()
  ? readdirSync(skills, { withFileTypes: true }) : [];
const publicSkills = new Set(skillDirs
  .filter(entry => entry.isDirectory() && /^[a-z0-9-]+$/.test(entry.name))
  .map(entry => join(skills, entry.name, "SKILL.md"))
  .filter(file => lstatSync(file, { throwIfNoEntry: false })?.isFile()));

export default function registerGuard(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("mgyoo-safe", "SAFE · workspace only");
  });

  // Pi 1.x also emits tool_call for calls nested in codemode scripts.
  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType("read", event) && publicSkills.has(event.input.path)) return;
    // The powershell tool exists only in native Windows Pi; keep the same policy if one appears.
    if (isToolCallEventType("bash", event) || isToolCallEventType("powershell", event)) {
      const decision = classifyCommand(event.input.command);
      if (!decision.allowed) {
        return { block: true, reason: decision.reason };
      }
      return;
    }

    if (
      isToolCallEventType("read", event) ||
      isToolCallEventType("write", event) ||
      isToolCallEventType("edit", event) ||
      isToolCallEventType("grep", event) ||
      isToolCallEventType("find", event) ||
      isToolCallEventType("ls", event)
    ) {
      const decision = await classifyPath({
        workspace: ctx.cwd,
        candidate: event.input.path ?? ".",
      });
      if (!decision.allowed) {
        return { block: true, reason: decision.reason };
      }
    }
  });
}
