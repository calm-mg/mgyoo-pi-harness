import { createHash, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const windows = process.platform === "win32";
const newline = windows ? "\r\n" : "\n";
const marker = windows ? "rem mgyoo-harness-v2 sha256:" : "# mgyoo-harness-v2 sha256:";
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

// Keep the receipt inside the launcher: no external manifest or paths to trust
// during removal, and no need for the previous checkout to still exist.
function receipt(body) {
  return marker + createHash("sha256").update(body).digest("hex") + newline;
}

function render(cli) {
  // A file URL keeps the batch file ASCII even for non-ASCII checkout paths.
  // CMD expands percent signs in batch files; double them in literal text.
  const body = windows
    ? ["@echo off", "setlocal DisableDelayedExpansion",
       `node --entry-url "${pathToFileURL(cli).href.replaceAll("%", "%%")}" %*`,
       "exit /b %ERRORLEVEL%", ""].join(newline)
    : `#!/bin/sh\nexec node ${shellQuote(cli)} "$@"\n`;
  return Buffer.from(body + receipt(body));
}

function existingLauncher(target) {
  const stat = lstatSync(target, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isFile() && stat.nlink === 1 && stat.size <= 1024 * 1024) {
    const bytes = readFileSync(target);
    const index = bytes.lastIndexOf(marker);
    if (index !== -1 && bytes.toString("latin1", index) === receipt(bytes.subarray(0, index))) {
      return bytes;
    }
  }
  throw new Error(`Refusing to change an unmanaged or modified launcher: ${target}. Move it aside manually first.`);
}

function bootstrap([action, ...args]) {
  if (!["install", "uninstall"].includes(action) ||
      (args.length && (args.length !== 1 || args[0] !== "--dry-run"))) {
    throw new Error("Expected install or uninstall, optionally followed by --dry-run.");
  }
  const dry = args.length === 1;
  const log = (message) => console.log((dry ? "[dry-run] " : "") + message);
  const bin = path.resolve(process.env.MGYOO_HARNESS_BIN_DIR || (windows
    ? path.join(process.env.LOCALAPPDATA, "mgyoo-harness", "bin")
    : path.join(homedir(), ".local", "bin")));
  const target = path.join(bin, windows ? "harness.cmd" : "harness");
  const old = existingLauncher(target);

  if (action === "uninstall") {
    if (!dry && old) unlinkSync(target);
    log(`${old ? "Remove" : "Already absent:"} ${target}. Profiles, auth and sessions are untouched.`);
    return;
  }

  const cli = fileURLToPath(new URL("../lib/cli.mjs", import.meta.url));
  const next = render(cli);
  const unchanged = old?.equals(next);
  if (!dry && !unchanged) {
    mkdirSync(bin, { recursive: true });
    const options = { flag: "wx", mode: 0o755 };
    if (!old) {
      writeFileSync(target, next, options);
    } else {
      const staged = path.join(bin, `.harness-${randomUUID()}.tmp`);
      writeFileSync(staged, next, options);
      try { renameSync(staged, target); }
      catch (error) { unlinkSync(staged); throw error; }
    }
  }
  log(`${unchanged ? "Unchanged:" : old ? "Update" : "Install"} ${target} -> ${cli}`);
  if (!process.env.PATH?.split(path.delimiter).some((entry) => entry && !path.relative(entry, bin))) {
    log(windows
      ? `Add ${bin} to your user Path in Environment Variables and open a new terminal.`
      : `Add to your shell profile: export PATH=${shellQuote(bin)}:"$PATH"`);
  }
  log("Next: harness setup pi --dry-run  or  harness setup omp --dry-run");
}

try {
  bootstrap(process.argv.slice(2));
} catch (error) {
  console.error(`harness bootstrap: ${error.message}`);
  process.exitCode = 1;
}
