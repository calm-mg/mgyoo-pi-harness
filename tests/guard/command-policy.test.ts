import { describe, expect, it } from "vitest";
import { classifyCommand } from "../../extensions/workspace-guard/command-policy.js";

describe("classifyCommand", () => {
  it.each([
    ["sudo apt update", "privilege-escalation"],
    ["rm -rf build", "recursive-delete"],
    ["git reset --hard HEAD~1", "destructive-git"],
    ["diskpart", "system-administration"],
    ["systemctl stop sshd", "system-administration"],
    ["Remove-Item -Recurse -Force build", "recursive-delete"],
    ["cat .env", "secret-access"],
    ["cp id_rsa copied-key", "secret-access"],
    ["Get-Content client.pem", "secret-access"],
  ])("blocks %s", (command, rule) => {
    expect(classifyCommand(command)).toMatchObject({ allowed: false, rule });
  });

  it.each([
    "npm test",
    "git status --short",
    "git diff --check",
    "rm build/output.tmp",
    "Remove-Item build/output.tmp",
  ])("allows %s", (command) => {
    expect(classifyCommand(command)).toEqual({ allowed: true });
  });

  it("conservatively blocks a quoted dangerous token", () => {
    expect(classifyCommand('echo "sudo apt update"')).toMatchObject({
      allowed: false,
      rule: "privilege-escalation",
    });
  });
});
