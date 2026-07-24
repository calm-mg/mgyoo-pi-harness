#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAX_TEXT_FILE_BYTES = 1024 * 1024;

const contentRules = [
  {
    name: "provider-api-key",
    pattern:
      /(?:OPENAI|ANTHROPIC)_API_KEY\s*[:=]\s*["']?(?!example|replace|your[-_])/i,
  },
  {
    name: "provider-api-key",
    pattern: /\bsk-(?:ant-|proj-|live-)?[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  },
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
];

const ignoredDirectories = new Set([".git", "node_modules", "dist", ".worktrees"]);

function normalizedRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function shouldIgnore(relativePath) {
  return normalizedRelativePath(relativePath)
    .split("/")
    .some((part) => ignoredDirectories.has(part));
}

function isPiAuthFile(relativePath) {
  return path.basename(relativePath).toLowerCase() === "auth.json";
}

export async function scanFiles(root, relativePaths) {
  const findings = [];
  const findingKeys = new Set();
  const uniquePaths = [...new Set(relativePaths)].sort((left, right) =>
    left.localeCompare(right),
  );

  for (const relativePath of uniquePaths) {
    if (shouldIgnore(relativePath)) {
      continue;
    }

    const displayPath = normalizedRelativePath(relativePath);
    const absolutePath = path.resolve(root, relativePath);

    if (!absolutePath.startsWith(`${path.resolve(root)}${path.sep}`)) {
      continue;
    }

    if (isPiAuthFile(relativePath)) {
      findings.push({ path: displayPath, line: 1, rule: "pi-auth-file" });
    }

    let metadata;
    try {
      metadata = await stat(absolutePath);
    } catch {
      continue;
    }

    if (!metadata.isFile() || metadata.size > MAX_TEXT_FILE_BYTES) {
      continue;
    }

    const contents = await readFile(absolutePath);
    if (contents.includes(0)) {
      continue;
    }

    const lines = contents.toString("utf8").split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      for (const rule of contentRules) {
        if (rule.pattern.test(line)) {
          const finding = {
            path: displayPath,
            line: index + 1,
            rule: rule.name,
          };
          const findingKey = `${finding.path}\0${finding.line}\0${finding.rule}`;
          if (!findingKeys.has(findingKey)) {
            findingKeys.add(findingKey);
            findings.push(finding);
          }
        }
      }
    }
  }

  return findings.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  );
}

function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    const reason = result.stderr.trim() || "git ls-files failed";
    throw new Error(reason);
  }

  return result.stdout.split("\0").filter(Boolean);
}

async function main() {
  const root = process.cwd();
  const findings = await scanFiles(root, repositoryFiles(root));

  if (findings.length === 0) {
    console.log("PASS secret-scan: no credential material found");
    return;
  }

  for (const finding of findings) {
    console.error(
      `FAIL secret-scan: ${finding.path}:${finding.line} [${finding.rule}]`,
    );
  }
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
