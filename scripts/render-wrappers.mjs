#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const commandByName = new Map([
  ["pi", "safe"],
  ["pi-yolo", "yolo"],
  ["pi-login", "login"],
  ["pi-doctor", "doctor"],
  ["pi-update", "update"],
]);

function shellQuote(value) {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function powershellQuote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function renderPosixWrapper(repositoryRoot, command) {
  const cli = path.join(repositoryRoot, "dist", "src", "cli.js");
  return [
    "#!/bin/sh",
    `exec node ${shellQuote(cli)} ${shellQuote(command)} \"$@\"`,
    "",
  ].join("\n");
}

export function renderPowerShellWrapper(repositoryRoot, command) {
  const cli = path.join(repositoryRoot, "dist", "src", "cli.js");
  return "\uFEFF" + [
    "$ErrorActionPreference = \"Stop\"",
    `$cli = ${powershellQuote(cli)}`,
    `& node $cli ${powershellQuote(command)} @args`,
    "exit $LASTEXITCODE",
    "",
  ].join("\r\n");
}

export function renderCmdShim(name) {
  return [
    "@echo off",
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%~dp0${name}.ps1\" %*`,
    "exit /b %ERRORLEVEL%",
    "",
  ].join("\r\n");
}

async function main() {
  const [platform, repositoryRoot, stageDirectory] = process.argv.slice(2);
  if (!["posix", "windows"].includes(platform) || !repositoryRoot || !stageDirectory) {
    throw new Error(
      "Usage: render-wrappers.mjs <posix|windows> <repository-root> <stage-directory>",
    );
  }

  await mkdir(stageDirectory, { recursive: true });
  for (const [name, command] of commandByName) {
    if (platform === "posix") {
      await writeFile(
        path.join(stageDirectory, name),
        renderPosixWrapper(repositoryRoot, command),
        { encoding: "utf8", mode: 0o755 },
      );
    } else {
      await writeFile(
        path.join(stageDirectory, `${name}.cmd`),
        renderCmdShim(name),
        "utf8",
      );
      await writeFile(
        path.join(stageDirectory, `${name}.ps1`),
        renderPowerShellWrapper(repositoryRoot, command),
        "utf8",
      );
    }
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
