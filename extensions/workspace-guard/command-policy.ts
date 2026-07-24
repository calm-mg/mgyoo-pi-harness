export type CommandDecision =
  | { allowed: true }
  | { allowed: false; reason: string; rule: string };

const rules = [
  {
    id: "privilege-escalation",
    pattern: /\b(?:sudo|doas)\b/i,
    reason: "Privilege escalation is disabled in safe mode",
  },
  {
    id: "recursive-delete",
    pattern:
      /\brm\s+[^;&|]*(?:-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b|\bRemove-Item\b(?=[^\r\n]*-(?:Recurse|r)\b)(?=[^\r\n]*-(?:Force|fo)\b)/i,
    reason: "Recursive forced deletion is disabled in safe mode",
  },
  {
    id: "destructive-git",
    pattern:
      /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s)/i,
    reason: "Destructive Git commands are disabled in safe mode",
  },
  {
    id: "system-administration",
    pattern:
      /(^|[;&|]\s*)(diskpart|systemctl|service|sc(?:\.exe)?|launchctl|useradd|userdel|net\s+user)\b/i,
    reason: "System administration commands are disabled in safe mode",
  },
] as const;

export function classifyCommand(command: string): CommandDecision {
  for (const rule of rules) {
    if (rule.pattern.test(command)) {
      return { allowed: false, reason: rule.reason, rule: rule.id };
    }
  }
  return { allowed: true };
}
