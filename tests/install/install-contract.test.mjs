import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const windows = process.platform === "win32";
const extension = windows ? "ps1" : "sh";
let home, bin, launcher, env;

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), "harness-bootstrap-"));
  bin = path.join(home, "user bin");
  launcher = path.join(bin, windows ? "harness.cmd" : "harness");
  env = {
    ...process.env,
    HOME: home, USERPROFILE: home, LOCALAPPDATA: home,
    MGYOO_HARNESS_BIN_DIR: bin, MGYOO_HARNESS_HOME: path.join(home, "state"),
    PI_CODING_AGENT_DIR: path.join(home, ".pi", "agent"),
  };
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

function lifecycle(action, { dry = false, root = repo } = {}) {
  const script = path.join(root, `${action}.${extension}`);
  return windows
    ? spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", script, ...(dry ? ["-DryRun"] : [])], { cwd: home, env, encoding: "utf8" })
    : spawnSync("sh", [script, ...(dry ? ["--dry-run"] : [])], { cwd: home, env, encoding: "utf8" });
}

function success(result) {
  expect(result.status, result.error?.message ?? result.stderr).toBe(0);
  return result.stdout;
}

it("previews without writing, installs only harness, and never purges user files", () => {
  expect(success(lifecycle("install", { dry: true }))).toContain("[dry-run]");
  expect(existsSync(bin)).toBe(false);
  expect(existsSync(env.MGYOO_HARNESS_HOME)).toBe(false);
  mkdirSync(bin);
  const sentinels = ["pi", "pi-yolo", "pi-login", "pi-doctor", "pi-update", "omp"].map(
    (name) => path.join(bin, windows ? `${name}.cmd` : name));
  sentinels.push(path.join(env.PI_CODING_AGENT_DIR, "settings.json"),
    path.join(home, ".omp", "settings.json"), path.join(env.MGYOO_HARNESS_HOME, "sessions", "user-data"));
  for (const file of sentinels) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "mine");
  }
  const before = readdirSync(bin);
  expect(success(lifecycle("install"))).toMatch(/path/i);
  expect(readdirSync(bin).sort()).toEqual([...before, path.basename(launcher)].sort());
  expect(success(lifecycle("install"))).toMatch(/unchanged/i);
  expect(success(lifecycle("uninstall", { dry: true }))).toContain("[dry-run]");
  expect(existsSync(launcher)).toBe(true);
  success(lifecycle("uninstall"));
  success(lifecycle("uninstall"));
  expect(readdirSync(bin)).toEqual(before);
  for (const file of sentinels) expect(readFileSync(file, "utf8")).toBe("mine");
}, 30000);

it("refuses to overwrite or uninstall both a pre-existing and an edited launcher", () => {
  mkdirSync(bin);
  writeFileSync(launcher, "my own harness\n");
  const refuse = () => {
    const before = readFileSync(launcher);
    for (const action of ["install", "uninstall"]) {
      const result = lifecycle(action);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/unmanaged or modified/i);
      expect(readFileSync(launcher)).toEqual(before);
    }
  };
  refuse();
  rmSync(launcher);
  success(lifecycle("install"));
  // Leave the generated receipt intact but change the program.
  writeFileSync(launcher, readFileSync(launcher, "utf8").replace("node ", "my-node "));
  refuse();
}, 30000);

it.skipIf(windows)("refuses a symbolic link, even when its target is absent", () => {
  mkdirSync(bin);
  const missing = path.join(home, "outside");
  symlinkSync(missing, launcher);
  for (const action of ["install", "uninstall"]) {
    const result = lifecycle(action);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unmanaged or modified/i);
  }
  expect(readdirSync(bin)).toEqual([path.basename(launcher)]);
  expect(existsSync(missing)).toBe(false);
});

it("explains the Node prerequisite before touching anything when node is missing", () => {
  const shell = windows
    ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "/bin/sh";
  const script = path.join(repo, `install.${extension}`);
  const args = windows ? ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script] : [script];
  // Environment keys are case-insensitive on Windows.
  const isolated = Object.fromEntries(Object.entries(env).filter(([key]) => key.toUpperCase() !== "PATH"));
  const result = spawnSync(shell, args, { cwd: home, env: { ...isolated, PATH: bin }, encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Node.js 24");
  expect(existsSync(bin)).toBe(false);
});

it("repoints the command after the checkout moves, including non-ASCII and shell metacharacters", () => {
  const first = path.join(home, "first checkout");
  const moved = path.join(home, "한글 & %PATH%! quote's");
  mkdirSync(path.join(first, "scripts"), { recursive: true });
  cpSync(path.join(repo, `install.${extension}`), path.join(first, `install.${extension}`));
  cpSync(path.join(repo, "scripts", "bootstrap.mjs"), path.join(first, "scripts", "bootstrap.mjs"));
  cpSync(path.join(repo, "lib"), path.join(first, "lib"), { recursive: true });
  success(lifecycle("install", { root: first }));
  renameSync(first, moved);
  success(lifecycle("install", { root: moved }));
  const options = { cwd: home, encoding: "utf8", env: { ...env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } };
  const run = (...args) => windows
    ? spawnSync("cmd.exe", ["/d", "/c", "harness", ...args], options)
    : spawnSync(launcher, args, options);
  expect(success(run("--help"))).toMatch(/harness setup/);
  expect(run("unknown").status).toBe(2);
}, 30000);
