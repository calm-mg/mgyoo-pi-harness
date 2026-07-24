import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { classifyCommand } from "./command-policy.js";
import { classifyPath } from "./path-policy.js";

export default function registerGuard(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("mgyoo-safe", "SAFE · workspace only");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType("bash", event)) {
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
