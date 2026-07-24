# mgyoo Pi Harness v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, cross-platform Pi harness whose default `pi` command runs in a Docker workspace boundary and whose explicit `pi-yolo` command runs Pi with host-user permissions.

**Architecture:** A small TypeScript CLI owns all shared behavior and is launched by thin PowerShell/POSIX wrappers. Safe mode runs Pi 0.82.0 in a Node 24 Docker image with only the current project bind-mounted read/write and a separate named volume for Pi state; YOLO mode runs the pinned host dependency directly. A global Pi extension adds path, secret-file, and dangerous-command checks as defense in depth.

**Tech Stack:** Node.js 24, TypeScript 5, Vitest, Pi `@earendil-works/pi-coding-agent@0.82.0`, Docker, PowerShell 7/Windows PowerShell 5.1-compatible bootstrap scripts, POSIX `sh`, GitHub Actions.

## Global Constraints

- Public target repository is `calm-mg/mgyoo-pi-harness`.
- Support Windows, macOS, and Linux.
- Korean is the primary documentation language.
- Default `pi` must not be able to write outside the current project on the host.
- `pi-yolo` must be an explicit host-permission opt-in and must not load the workspace guard.
- Safe and YOLO authentication, sessions, and caches must remain separate.
- Support both OpenAI and Anthropic through Pi `/login`; select models through `/model`.
- Never commit or print credentials, passwords, `auth.json`, sessions, `.env`, private keys, Docker volume data, local backups, or diagnostic environment dumps.
- Do not automatically request administrator privileges or modify system directories.
- Pin Pi to exact version `0.82.0`; upgrades require an intentional reviewed change.
- Use Docker image base `node:24-bookworm-slim`.
- Treat Pi project trust as input loading, not as a sandbox.
- Safe-mode outbound network remains enabled in v1.
- Third-party permission packages, MCP bundles, subagent orchestration, automatic model routing, chat integrations, and complete network sandboxing are out of v1 scope.

---

## File Map

### Repository and build

- `package.json`: pinned runtime/dev dependencies, build/test/check scripts, and package metadata.
- `package-lock.json`: reproducible dependency resolution.
- `tsconfig.json`: strict ESM TypeScript compilation into `dist/`.
- `.gitignore`: excludes dependencies, builds, credentials, sessions, backups, and diagnostics.
- `.gitattributes`: preserves LF for shell and container files.
- `src/constants.ts`: shared product, Pi version, image, volume, and path names.
- `src/process.ts`: injectable child-process runner used by CLI commands.
- `src/cli.ts`: command parser and dispatcher.

### Guard

- `extensions/workspace-guard/path-policy.ts`: canonical path containment and secret-path decisions.
- `extensions/workspace-guard/command-policy.ts`: deterministic dangerous-command decisions.
- `extensions/workspace-guard/index.ts`: Pi `tool_call` adapter and visible safe-mode status.
- `tests/guard/path-policy.test.ts`: path escape, symlink, Windows path, and secret tests.
- `tests/guard/command-policy.test.ts`: dangerous-command and false-positive tests.
- `tests/guard/extension.test.ts`: Pi event adapter tests.

### Pi configuration and container

- `config/settings.safe.json`: safe container settings and automatic project trust.
- `config/settings.yolo.json`: host settings and automatic project trust.
- `config/AGENTS.md`: concise shared operating rules.
- `container/Dockerfile`: pinned Pi runtime.
- `container/entrypoint.sh`: seeds managed safe configuration into the named volume before Pi starts.
- `.dockerignore`: minimal Docker build context.
- `tests/container/container-files.test.ts`: static image/config contract tests.
- `tests/container/smoke.ps1`: Windows Docker smoke test entry.
- `tests/container/smoke.sh`: POSIX Docker smoke test entry.

### CLI commands

- `src/commands/safe.ts`: validates Docker and runs current directory in safe container.
- `src/commands/yolo.ts`: runs the pinned host Pi and prints a warning banner.
- `src/commands/login.ts`: selects safe or YOLO Pi authentication storage.
- `src/commands/doctor.ts`: structured diagnostics with redacted output and remedies.
- `src/commands/update.ts`: clean-tree check, pull, dependency refresh, image rebuild, doctor.
- `src/docker.ts`: platform-neutral Docker argument construction.
- `src/paths.ts`: repository, user-bin, host-agent, and executable path resolution.
- `tests/commands/*.test.ts`: argument, boundary, warning, login, doctor, and update tests.

### Installation

- `install.ps1`, `install.sh`: dependency checks, staged build, backup, wrapper installation, manifest.
- `uninstall.ps1`, `uninstall.sh`: remove managed files, preserve data by default, explicit purge.
- `scripts/templates/pi.cmd`, `scripts/templates/pi-yolo.cmd`, `scripts/templates/pi-login.cmd`, `scripts/templates/pi-doctor.cmd`, `scripts/templates/pi-update.cmd`: Windows wrappers.
- `scripts/templates/pi`, `scripts/templates/pi-yolo`, `scripts/templates/pi-login`, `scripts/templates/pi-doctor`, `scripts/templates/pi-update`: POSIX wrappers.
- `tests/install/install-contract.test.ts`: static and manifest contracts.

### Documentation and project operations

- `README.md`: Korean 10-minute quickstart and navigation.
- `docs/01-getting-started.md`: platform setup and first run.
- `docs/02-models-and-login.md`: providers, `/login`, `/model`, cycling, thinking.
- `docs/03-safe-vs-yolo.md`: security model and examples.
- `docs/04-customizing-pi.md`: settings, AGENTS, prompts, skills, extensions.
- `docs/05-troubleshooting.md`: doctor interpretation and recovery.
- `docs/learning-roadmap.md`: staged practice path.
- `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`: public project policy.
- `.github/workflows/ci.yml`: three-OS checks and Linux Docker smoke test.
- `.github/dependabot.yml`: controlled npm and Actions update proposals.
- `scripts/check-secrets.d.mts`: TypeScript declaration for the JavaScript scanner module.

---

### Task 1: Reproducible TypeScript foundation

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `src/constants.ts`
- Create: `src/process.ts`
- Create: `src/cli.ts`
- Test: `tests/foundation.test.ts`

**Interfaces:**
- Produces: `HARNESS_NAME`, `PI_VERSION`, `IMAGE_NAME`, `SAFE_VOLUME`, and `ProcessRunner`.
- Produces: a working `--help` and `--version` CLI shell that later tasks extend with operational commands.
- Consumes: no earlier tasks.

- [ ] **Step 1: Write the failing foundation test**

Create `tests/foundation.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  HARNESS_NAME,
  IMAGE_NAME,
  PI_VERSION,
  SAFE_VOLUME,
} from "../src/constants.js";

describe("repository foundation", () => {
  it("pins Pi and stable resource names", () => {
    expect(HARNESS_NAME).toBe("mgyoo-pi-harness");
    expect(PI_VERSION).toBe("0.82.0");
    expect(IMAGE_NAME).toBe("mgyoo-pi-harness:0.82.0");
    expect(SAFE_VOLUME).toBe("mgyoo-pi-safe-agent");
  });

  it("keeps secrets and generated state out of git", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    for (const entry of [
      "node_modules/",
      "dist/",
      "auth.json",
      "sessions/",
      ".env",
      "*.pem",
      "*.key",
      "backups/",
      "diagnostics/",
    ]) {
      expect(ignore).toContain(entry);
    }
  });
});
```

- [ ] **Step 2: Create the minimal package metadata and verify the test fails**

Create `package.json` with:

```json
{
  "name": "mgyoo-pi-harness",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "check": "npm run typecheck && npm test"
  },
  "dependencies": {
    "@earendil-works/pi-coding-agent": "0.82.0"
  },
  "devDependencies": {
    "@types/node": "24.0.15",
    "typescript": "5.8.3",
    "vitest": "3.2.4"
  }
}
```

Run: `npm install --ignore-scripts`

Run: `npm test -- tests/foundation.test.ts`

Expected: FAIL because `src/constants.ts` and `.gitignore` do not exist.

- [ ] **Step 3: Add strict compiler and repository policy files**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "extensions/**/*.ts", "tests/**/*.ts"]
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
auth.json
sessions/
.env
.env.*
*.pem
*.key
backups/
diagnostics/
*.log
.pi/
```

Create `.gitattributes`:

```gitattributes
*.sh text eol=lf
Dockerfile text eol=lf
*.md text eol=lf
*.json text eol=lf
*.ts text eol=lf
```

- [ ] **Step 4: Implement constants, process boundary, and CLI dispatcher**

Create `src/constants.ts`:

```ts
export const HARNESS_NAME = "mgyoo-pi-harness";
export const PI_VERSION = "0.82.0";
export const IMAGE_NAME = `${HARNESS_NAME}:${PI_VERSION}`;
export const SAFE_VOLUME = "mgyoo-pi-safe-agent";
```

Create `src/process.ts`:

```ts
import { spawn } from "node:child_process";

export interface RunRequest {
  command: string;
  args: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessRunner {
  run(request: RunRequest): Promise<number>;
}

export const systemRunner: ProcessRunner = {
  run(request) {
    return new Promise((resolve, reject) => {
      const child = spawn(request.command, request.args, {
        cwd: request.cwd,
        env: request.env ?? process.env,
        stdio: "inherit",
        shell: false,
      });
      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });
  },
};
```

Create `src/cli.ts`:

```ts
import { HARNESS_NAME, PI_VERSION } from "./constants.js";

const [argument = "--help"] = process.argv.slice(2);

if (argument === "--version") {
  console.log(`${HARNESS_NAME} (Pi ${PI_VERSION})`);
} else if (argument === "--help") {
  console.log(`Usage: ${HARNESS_NAME} [--help|--version]`);
} else {
  console.error(`Unknown argument: ${argument}`);
  process.exitCode = 2;
}
```

- [ ] **Step 5: Run foundation verification**

Run: `npm run check`

Expected: PASS with all foundation tests green and no TypeScript errors.

- [ ] **Step 6: Commit the foundation**

```sh
git add package.json package-lock.json tsconfig.json .gitignore .gitattributes src/constants.ts src/process.ts src/cli.ts tests/foundation.test.ts
git commit -m "build: add reproducible TypeScript foundation"
```

---

### Task 2: Workspace path and secret policy

**Files:**
- Create: `extensions/workspace-guard/path-policy.ts`
- Test: `tests/guard/path-policy.test.ts`

**Interfaces:**
- Produces: `classifyPath(input: PathCheckInput): Promise<PathDecision>`.
- Produces: `PathDecision = { allowed: true; absolutePath: string } | { allowed: false; reason: string }`.
- Consumes: Node filesystem and path APIs only.

- [ ] **Step 1: Write failing containment and secret tests**

Create `tests/guard/path-policy.test.ts` with temporary workspace setup and these assertions:

```ts
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyPath } from "../../extensions/workspace-guard/path-policy.js";

describe("classifyPath", () => {
  it("allows a normal file below the workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
    await expect(classifyPath({ workspace, candidate: "src/app.ts" }))
      .resolves.toMatchObject({ allowed: true });
  });

  it("blocks parent traversal", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
    await expect(classifyPath({ workspace, candidate: "../outside.txt" }))
      .resolves.toEqual({ allowed: false, reason: "Path escapes the workspace" });
  });

  it("blocks a symlink that resolves outside", async () => {
    const root = await mkdtemp(join(tmpdir(), "mgyoo-root-"));
    const workspace = join(root, "workspace");
    const outside = join(root, "outside");
    await mkdir(workspace);
    await mkdir(outside);
    await writeFile(join(outside, "secret.txt"), "secret");
    await symlink(outside, join(workspace, "link"), "dir");
    await expect(classifyPath({ workspace, candidate: "link/secret.txt" }))
      .resolves.toEqual({ allowed: false, reason: "Path escapes the workspace" });
  });

  it.each([".env", ".env.local", "id_rsa", "client.pem", "private.key"])(
    "blocks secret path %s",
    async (candidate) => {
      const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
      await expect(classifyPath({ workspace, candidate }))
        .resolves.toEqual({ allowed: false, reason: "Secret files are protected" });
    },
  );
});
```

- [ ] **Step 2: Run the focused test and observe the missing module**

Run: `npm test -- tests/guard/path-policy.test.ts`

Expected: FAIL with module-not-found for `path-policy.ts`.

- [ ] **Step 3: Implement canonical containment**

Create `extensions/workspace-guard/path-policy.ts`:

```ts
import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

export interface PathCheckInput {
  workspace: string;
  candidate: string;
}

export type PathDecision =
  | { allowed: true; absolutePath: string }
  | { allowed: false; reason: string };

const secretNames = new Set([".env", "id_rsa", "id_ed25519"]);

function isSecretPath(path: string): boolean {
  const name = basename(path).toLowerCase();
  return (
    secretNames.has(name) ||
    name.startsWith(".env.") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}

async function canonicalizeNewPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    const parent = dirname(path);
    if (parent === path) return resolve(path);
    return resolve(await canonicalizeNewPath(parent), basename(path));
  }
}

function isContained(workspace: string, candidate: string): boolean {
  const rel = relative(workspace, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function classifyPath(input: PathCheckInput): Promise<PathDecision> {
  const workspace = await realpath(input.workspace);
  const absolute = resolve(workspace, input.candidate);
  if (isSecretPath(absolute)) {
    return { allowed: false, reason: "Secret files are protected" };
  }
  const canonical = await canonicalizeNewPath(absolute);
  if (!isContained(workspace, canonical)) {
    return { allowed: false, reason: "Path escapes the workspace" };
  }
  return { allowed: true, absolutePath: canonical };
}
```

- [ ] **Step 4: Add platform-specific cases**

Extend `tests/guard/path-policy.test.ts` with:

```ts
it("blocks an absolute path outside the workspace", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
  const outside = join(await mkdtemp(join(tmpdir(), "mgyoo-outside-")), "x.txt");
  await expect(classifyPath({ workspace, candidate: outside }))
    .resolves.toEqual({ allowed: false, reason: "Path escapes the workspace" });
});

it("does not treat env.example as a secret", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "mgyoo-workspace-"));
  await expect(classifyPath({ workspace, candidate: "env.example" }))
    .resolves.toMatchObject({ allowed: true });
});
```

On Windows, add a case using a different temporary drive only when one is available; otherwise assert that an absolute path in another temp root is blocked. Do not synthesize invalid drive paths on non-Windows runners.

- [ ] **Step 5: Run the path policy suite**

Run: `npm test -- tests/guard/path-policy.test.ts`

Expected: PASS for normal paths, traversal, absolute paths, secrets, and symlinks.

- [ ] **Step 6: Commit the path policy**

```sh
git add extensions/workspace-guard/path-policy.ts tests/guard/path-policy.test.ts
git commit -m "feat: enforce workspace path policy"
```

---

### Task 3: Dangerous command policy

**Files:**
- Create: `extensions/workspace-guard/command-policy.ts`
- Test: `tests/guard/command-policy.test.ts`

**Interfaces:**
- Produces: `classifyCommand(command: string): CommandDecision`.
- Produces: `CommandDecision = { allowed: true } | { allowed: false; reason: string; rule: string }`.
- Consumes: no earlier task.

- [ ] **Step 1: Write failing dangerous-command tests**

Create `tests/guard/command-policy.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the command test and observe the missing module**

Run: `npm test -- tests/guard/command-policy.test.ts`

Expected: FAIL with module-not-found for `command-policy.ts`.

- [ ] **Step 3: Implement ordered deterministic rules**

Create `extensions/workspace-guard/command-policy.ts`:

```ts
export type CommandDecision =
  | { allowed: true }
  | { allowed: false; reason: string; rule: string };

const rules = [
  {
    id: "privilege-escalation",
    pattern: /(^|[;&|]\s*)(sudo|doas)\b/i,
    reason: "Privilege escalation is disabled in safe mode",
  },
  {
    id: "recursive-delete",
    pattern: /\brm\s+[^;&|]*(?:-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b|\bRemove-Item\b[^\r\n]*-(?:Recurse|r)\b[^\r\n]*-(?:Force|fo)\b/i,
    reason: "Recursive forced deletion is disabled in safe mode",
  },
  {
    id: "destructive-git",
    pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s)/i,
    reason: "Destructive Git commands are disabled in safe mode",
  },
  {
    id: "system-administration",
    pattern: /(^|[;&|]\s*)(diskpart|systemctl|service|sc(?:\.exe)?|launchctl|useradd|userdel|net\s+user)\b/i,
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
```

- [ ] **Step 4: Add regression cases for quoting and harmless words**

Add assertions that `echo "sudo is unavailable"` and `printf "rm -rf"` are documented limitations rather than security guarantees. The test should assert current conservative behavior explicitly so later parser improvements are intentional:

```ts
it("conservatively blocks a quoted dangerous token", () => {
  expect(classifyCommand('echo "sudo apt update"')).toMatchObject({
    allowed: false,
    rule: "privilege-escalation",
  });
});
```

- [ ] **Step 5: Run command policy verification**

Run: `npm test -- tests/guard/command-policy.test.ts`

Expected: PASS with deterministic rule IDs.

- [ ] **Step 6: Commit the command policy**

```sh
git add extensions/workspace-guard/command-policy.ts tests/guard/command-policy.test.ts
git commit -m "feat: block dangerous safe-mode commands"
```

---

### Task 4: Pi workspace-guard extension and managed settings

**Files:**
- Create: `extensions/workspace-guard/index.ts`
- Create: `config/settings.safe.json`
- Create: `config/settings.yolo.json`
- Create: `config/AGENTS.md`
- Test: `tests/guard/extension.test.ts`
- Test: `tests/config/settings.test.ts`

**Interfaces:**
- Consumes: `classifyPath()` and `classifyCommand()`.
- Produces: default Pi extension factory that registers one `tool_call` handler and safe-mode footer status.
- Produces: settings with `defaultProjectTrust: "always"` and no credentials or fixed provider/model.

- [ ] **Step 1: Write failing extension adapter tests**

Create a fake API in `tests/guard/extension.test.ts` that records registered handlers:

```ts
import { describe, expect, it, vi } from "vitest";
import registerGuard from "../../extensions/workspace-guard/index.js";

describe("workspace guard extension", () => {
  it("blocks an edit outside cwd", async () => {
    let handler: ((event: unknown, context: unknown) => Promise<unknown>) | undefined;
    const pi = {
      on: vi.fn((name: string, callback: typeof handler) => {
        if (name === "tool_call") handler = callback;
      }),
    };
    registerGuard(pi as never);
    expect(handler).toBeDefined();
    const result = await handler!(
      { toolName: "edit", input: { path: "../outside.txt" } },
      { cwd: process.cwd(), ui: { setStatus: vi.fn() } },
    );
    expect(result).toEqual({
      block: true,
      reason: "Path escapes the workspace",
    });
  });
});
```

Also add cases for `read` of `.env`, allowed `write` under cwd, and blocked `bash` with `sudo`.

- [ ] **Step 2: Run extension tests and observe failure**

Run: `npm test -- tests/guard/extension.test.ts`

Expected: FAIL because `index.ts` does not exist.

- [ ] **Step 3: Implement the Pi adapter**

Create `extensions/workspace-guard/index.ts` using Pi’s typed event helper:

```ts
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
      if (!decision.allowed) return { block: true, reason: decision.reason };
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
      const candidate = "path" in event.input ? event.input.path : ".";
      const decision = await classifyPath({
        workspace: ctx.cwd,
        candidate: String(candidate),
      });
      if (!decision.allowed) return { block: true, reason: decision.reason };
    }
  });
}
```

During implementation, inspect the installed Pi 0.82.0 input types for `grep`, `find`, and `ls`; replace the generic `"path" in event.input` branch with the exact typed property names exported by that version.

- [ ] **Step 4: Add safe and YOLO settings tests**

Create `tests/config/settings.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

for (const mode of ["safe", "yolo"]) {
  it(`${mode} settings trust projects without fixing a model`, async () => {
    const raw = await readFile(`config/settings.${mode}.json`, "utf8");
    const settings = JSON.parse(raw) as Record<string, unknown>;
    expect(settings.defaultProjectTrust).toBe("always");
    expect(settings).not.toHaveProperty("defaultProvider");
    expect(settings).not.toHaveProperty("defaultModel");
    expect(raw).not.toMatch(/api[_-]?key|token|password/i);
  });
}
```

- [ ] **Step 5: Create managed settings and shared instructions**

Create `config/settings.safe.json`:

```json
{
  "defaultProjectTrust": "always",
  "defaultThinkingLevel": "medium",
  "enableInstallTelemetry": false,
  "enableAnalytics": false,
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000
  }
}
```

Create `config/settings.yolo.json` with the same non-security runtime defaults and `defaultProjectTrust: "always"`. Do not add the guard to YOLO settings.

Create `config/AGENTS.md` with concise rules. Installers and the safe-container entrypoint install this source file as Pi's global `APPEND_SYSTEM.md`, because Pi loads global system additions from that filename:

```markdown
# mgyoo Pi Harness

- 먼저 현재 프로젝트의 지침과 상태를 읽는다.
- 사용자가 요청한 범위 안에서 자율적으로 진행한다.
- 비밀정보를 출력, 복사, 커밋하지 않는다.
- 기존 사용자 변경을 보존한다.
- 완료를 주장하기 전에 관련 테스트와 diff를 확인한다.
- SAFE 모드의 차단을 우회하려 하지 않는다. 호스트 권한이 필요하면 사용자가 `pi-yolo`를 직접 선택해야 한다.
```

- [ ] **Step 6: Run adapter and settings checks**

Run: `npm test -- tests/guard/extension.test.ts tests/config/settings.test.ts`

Expected: PASS; safe blocks and YOLO settings contain no guard registration.

Run: `npm run typecheck`

Expected: PASS against Pi 0.82.0 extension types.

- [ ] **Step 7: Commit the extension and configuration**

```sh
git add extensions/workspace-guard/index.ts config tests/guard/extension.test.ts tests/config/settings.test.ts
git commit -m "feat: add Pi safe-mode workspace guard"
```

---

### Task 5: Pinned safe-mode Docker image

**Files:**
- Create: `container/Dockerfile`
- Create: `container/entrypoint.sh`
- Create: `.dockerignore`
- Test: `tests/container/container-files.test.ts`
- Test: `tests/container/smoke.sh`
- Test: `tests/container/smoke.ps1`

**Interfaces:**
- Consumes: `config/settings.safe.json`, `config/AGENTS.md`, and `extensions/workspace-guard/`.
- Produces: Docker image `mgyoo-pi-harness:0.82.0`.
- Produces: entrypoint contract `entrypoint.sh [pi args...]`.

- [ ] **Step 1: Write failing static container contract tests**

Create `tests/container/container-files.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("safe container", () => {
  it("pins Node and Pi and does not expose the Docker socket", async () => {
    const dockerfile = await readFile("container/Dockerfile", "utf8");
    expect(dockerfile).toContain("FROM node:24-bookworm-slim");
    expect(dockerfile).toContain("@earendil-works/pi-coding-agent@0.82.0");
    expect(dockerfile).not.toContain("/var/run/docker.sock");
  });

  it("seeds managed files without overwriting auth", async () => {
    const entrypoint = await readFile("container/entrypoint.sh", "utf8");
    expect(entrypoint).toContain("settings.json");
    expect(entrypoint).toContain("workspace-guard");
    expect(entrypoint).not.toContain("auth.json");
    expect(entrypoint).not.toContain("rm -rf");
  });
});
```

- [ ] **Step 2: Run the static test and observe missing files**

Run: `npm test -- tests/container/container-files.test.ts`

Expected: FAIL because container files do not exist.

- [ ] **Step 3: Implement the pinned image**

Create `container/Dockerfile`:

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent@0.82.0

COPY config/settings.safe.json /opt/mgyoo-pi-harness/agent-template/settings.json
COPY config/AGENTS.md /opt/mgyoo-pi-harness/agent-template/APPEND_SYSTEM.md
COPY extensions/workspace-guard /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard
COPY container/entrypoint.sh /usr/local/bin/mgyoo-pi-entrypoint

RUN chmod 0755 /usr/local/bin/mgyoo-pi-entrypoint
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/mgyoo-pi-entrypoint"]
```

Create `container/entrypoint.sh`:

```sh
#!/bin/sh
set -eu

agent_dir="${PI_CODING_AGENT_DIR:-/root/.pi/agent}"
template_dir="/opt/mgyoo-pi-harness/agent-template"

mkdir -p "$agent_dir/extensions/workspace-guard"
cp "$template_dir/settings.json" "$agent_dir/settings.json"
cp "$template_dir/APPEND_SYSTEM.md" "$agent_dir/APPEND_SYSTEM.md"
cp "$template_dir/extensions/workspace-guard/"*.ts "$agent_dir/extensions/workspace-guard/"

exec pi "$@"
```

Create `.dockerignore` that includes only needed runtime sources:

```dockerignore
*
!config/
!config/settings.safe.json
!config/AGENTS.md
!extensions/
!extensions/workspace-guard/
!extensions/workspace-guard/*.ts
!container/
!container/Dockerfile
!container/entrypoint.sh
```

- [ ] **Step 4: Add portable smoke scripts**

`tests/container/smoke.sh` must build the image, create a temporary workspace and a separate host sentinel, then run a non-LLM shell probe inside the image entrypoint override:

```sh
#!/bin/sh
set -eu
docker build -t mgyoo-pi-harness:0.82.0 -f container/Dockerfile .
workspace="$(mktemp -d)"
sentinel="$(mktemp)"
docker run --rm --entrypoint sh -v "$workspace:/workspace" mgyoo-pi-harness:0.82.0 \
  -c 'touch /workspace/inside.txt && test ! -e /host-sentinel'
test -f "$workspace/inside.txt"
test -f "$sentinel"
```

`tests/container/smoke.ps1` implements the same assertions with `New-Item -ItemType Directory`, `New-TemporaryFile`, `docker run`, and `Test-Path`. It must not recursively delete a computed path; use the OS temporary directory and remove only exact created files after resolving them.

- [ ] **Step 5: Run static and Docker tests**

Run: `npm test -- tests/container/container-files.test.ts`

Expected: PASS.

Run on a Docker-capable host: `docker build -t mgyoo-pi-harness:0.82.0 -f container/Dockerfile .`

Expected: successful image build with Pi 0.82.0.

Run on POSIX: `sh tests/container/smoke.sh`

Run on Windows: `pwsh -File tests/container/smoke.ps1`

Expected: workspace file exists; host sentinel remains unchanged and is not visible in the container.

- [ ] **Step 6: Commit the container**

```sh
git add container .dockerignore tests/container
git commit -m "feat: add isolated Pi safe-mode image"
```

---

### Task 6: Shared CLI for safe, YOLO, and login modes

**Files:**
- Create: `src/paths.ts`
- Create: `src/docker.ts`
- Create: `src/commands/safe.ts`
- Create: `src/commands/yolo.ts`
- Create: `src/commands/login.ts`
- Modify: `src/cli.ts`
- Test: `tests/commands/safe.test.ts`
- Test: `tests/commands/yolo.test.ts`
- Test: `tests/commands/login.test.ts`

**Interfaces:**
- Consumes: constants and `ProcessRunner`.
- Produces: `buildSafeDockerArgs(input: SafeRunInput): string[]`.
- Produces: `runSafe(args, deps)`, `runYolo(args, deps)`, and `runLogin(mode, deps)` returning exit-code promises.

- [ ] **Step 1: Write failing Docker argument tests**

Create `tests/commands/safe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSafeDockerArgs } from "../../src/docker.js";

describe("buildSafeDockerArgs", () => {
  it("mounts only cwd and the named Pi volume", () => {
    const args = buildSafeDockerArgs({
      cwd: "/work/app",
      interactive: true,
      piArgs: ["--model", "openai/example"],
    });
    expect(args).toContain("/work/app:/workspace");
    expect(args).toContain("mgyoo-pi-safe-agent:/root/.pi/agent");
    expect(args.join(" ")).not.toContain("/var/run/docker.sock");
    expect(args.join(" ")).not.toContain(":/root");
  });
});
```

Add a Windows test with `cwd: "D:\\work\\app"` and assert the mount is passed as one array element without shell quoting.

- [ ] **Step 2: Write failing YOLO and login tests**

Use a fake `ProcessRunner` that records `RunRequest`. Assert:

- YOLO writes a banner containing `YOLO`, cwd, and `host permissions`.
- YOLO invokes the repository-local `node_modules/.bin/pi` (`pi.cmd` on Windows).
- `login safe` invokes Docker with the safe named volume and no workspace bind.
- `login yolo` invokes host Pi.
- unknown login mode returns exit code 2 without spawning.

- [ ] **Step 3: Run focused tests and observe missing modules**

Run: `npm test -- tests/commands/safe.test.ts tests/commands/yolo.test.ts tests/commands/login.test.ts`

Expected: FAIL because command modules do not exist.

- [ ] **Step 4: Implement exact Docker argument construction**

Create `src/docker.ts`:

```ts
import { IMAGE_NAME, SAFE_VOLUME } from "./constants.js";

export interface SafeRunInput {
  cwd: string;
  interactive: boolean;
  piArgs: readonly string[];
}

export function buildSafeDockerArgs(input: SafeRunInput): string[] {
  return [
    "run",
    "--rm",
    ...(input.interactive ? ["-it"] : []),
    "--mount",
    `type=bind,source=${input.cwd},target=/workspace`,
    "--mount",
    `type=volume,source=${SAFE_VOLUME},target=/root/.pi/agent`,
    "--workdir",
    "/workspace",
    IMAGE_NAME,
    ...input.piArgs,
  ];
}
```

Use `--mount` rather than `-v` so source/target fields remain explicit. Before spawning, `runSafe` resolves cwd through `realpath` and rejects newline or NUL characters.

- [ ] **Step 5: Implement host Pi path and mode commands**

`src/paths.ts` exports:

```ts
export interface HarnessPaths {
  repositoryRoot: string;
  hostPiExecutable: string;
  hostAgentDir: string;
}

export function resolveHarnessPaths(metaUrl: string, platform = process.platform): HarnessPaths;
```

Resolve repository root relative to `import.meta.url`; use `node_modules/.bin/pi.cmd` on Windows and `node_modules/.bin/pi` elsewhere. Resolve host agent dir from `PI_CODING_AGENT_DIR` when set, otherwise the documented user home default.

Implement `runSafe`, `runYolo`, and `runLogin` with dependency injection:

```ts
export interface CommandDeps {
  runner: ProcessRunner;
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
  cwd: string;
  paths: HarnessPaths;
}
```

Safe calls `docker` with `buildSafeDockerArgs`. YOLO writes the warning then invokes `hostPiExecutable`. Safe login launches the Pi TUI in a neutral empty container workspace with only the named agent volume and first prints “Pi에서 `/login`을 입력하세요.” YOLO login launches the host Pi TUI and prints the same instruction. Neither command invents an unsupported `--login` flag.

- [ ] **Step 6: Expand the CLI dispatcher**

Parse the executable-selected mode from `process.argv[2]` and forward remaining arguments without shell interpolation:

```ts
const [command = "safe", ...args] = process.argv.slice(2);
const handlers = {
  safe: () => runSafe(args, deps),
  yolo: () => runYolo(args, deps),
  login: () => runLogin(args[0], deps),
};
```

Unknown commands print the supported command list and return exit code 2. Task 8 extends the same dispatcher with `doctor` and `update`.

- [ ] **Step 7: Run command tests and typecheck**

Run: `npm test -- tests/commands`

Expected: PASS with exact spawn argument arrays and no shell command strings.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit the mode CLI**

```sh
git add src tests/commands
git commit -m "feat: add safe yolo and login commands"
```

---

### Task 7: Cross-platform installation and managed wrappers

**Files:**
- Create: `install.ps1`
- Create: `install.sh`
- Create: `uninstall.ps1`
- Create: `uninstall.sh`
- Create: `scripts/templates/pi.cmd`
- Create: `scripts/templates/pi-yolo.cmd`
- Create: `scripts/templates/pi-login.cmd`
- Create: `scripts/templates/pi`
- Create: `scripts/templates/pi-yolo`
- Create: `scripts/templates/pi-login`
- Test: `tests/install/install-contract.test.ts`

**Interfaces:**
- Consumes: compiled `dist/src/cli.js`, package scripts, and Dockerfile.
- Produces: user-bin wrappers and `install-manifest.json`.
- Supports: `MGYOO_PI_BIN_DIR`, `MGYOO_PI_STATE_DIR`, and `MGYOO_PI_DRY_RUN=1` for testing.

- [ ] **Step 1: Write failing installer contract tests**

Create `tests/install/install-contract.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

for (const file of ["install.sh", "install.ps1", "uninstall.sh", "uninstall.ps1"]) {
  it(`${file} supports isolated test locations`, async () => {
    const text = await readFile(file, "utf8");
    expect(text).toContain("MGYOO_PI_BIN_DIR");
    expect(text).toContain("MGYOO_PI_STATE_DIR");
  });
}

it("installers never invoke sudo or recursive deletion", async () => {
  const files = await Promise.all([
    readFile("install.sh", "utf8"),
    readFile("install.ps1", "utf8"),
  ]);
  expect(files.join("\n")).not.toMatch(/\bsudo\b|rm\s+-rf|Remove-Item[^\n]+-Recurse/);
});
```

Add wrapper assertions that each wrapper calls the absolute repository `dist/src/cli.js` with one fixed subcommand and forwards arguments without `eval`.

- [ ] **Step 2: Run installer contract tests and observe missing files**

Run: `npm test -- tests/install/install-contract.test.ts`

Expected: FAIL because installers and templates do not exist.

- [ ] **Step 3: Implement wrapper templates**

POSIX `scripts/templates/pi`:

```sh
#!/bin/sh
exec node "__REPOSITORY_ROOT__/dist/src/cli.js" safe "$@"
```

Windows `scripts/templates/pi.cmd`:

```bat
@echo off
node "__REPOSITORY_ROOT__\dist\src\cli.js" safe %*
exit /b %ERRORLEVEL%
```

Create corresponding templates with fixed `yolo` and `login` subcommands. Installers replace only the literal `__REPOSITORY_ROOT__` token with the canonical clone path. Task 8 adds doctor and update wrappers after those commands exist.

- [ ] **Step 4: Implement staged POSIX installation**

`install.sh` must:

1. `set -eu`.
2. Resolve its own repository directory without changing the caller’s cwd permanently.
3. Check `git`, `node`, `npm`, and `docker`; print an official installation URL and exit 1 when absent.
4. Require Node major version at least 24.
5. Run `npm ci --ignore-scripts`, `npm run check`, and `npm run build`.
6. Build `mgyoo-pi-harness:0.82.0`.
7. Use `${MGYOO_PI_BIN_DIR:-$HOME/.local/bin}` and `${MGYOO_PI_STATE_DIR:-$HOME/.local/state/mgyoo-pi-harness}`.
8. Stage wrappers under a new directory inside the state directory.
9. Back up existing same-name wrappers to `backups/<UTC timestamp>/`.
10. Back up host `settings.json` and `APPEND_SYSTEM.md`, then install `config/settings.yolo.json` as host `settings.json` and `config/AGENTS.md` as host `APPEND_SYSTEM.md`.
11. Move exact staged files into the user bin and write `install-manifest.json`.
12. Never edit `/usr`, `/etc`, `/opt`, shell rc files, or system PATH.
13. Print the one-line PATH export the user may add if the bin directory is not already on PATH.

Dry-run mode prints intended operations but does not run npm, Docker, or filesystem mutations.

- [ ] **Step 5: Implement staged PowerShell installation**

`install.ps1` mirrors the POSIX behavior using:

- `$env:LOCALAPPDATA\mgyoo-pi-harness\bin` as the default user bin.
- `$env:LOCALAPPDATA\mgyoo-pi-harness\state` as the default state directory.
- `Resolve-Path -LiteralPath` for exact targets.
- `Start-Process -Wait -NoNewWindow` or direct argv arrays, never `Invoke-Expression`.
- `[Environment]::SetEnvironmentVariable("Path", ..., "User")` only after showing the exact added user-bin entry; do not modify machine PATH.
- Exact `Copy-Item`, `Move-Item`, and `Remove-Item -LiteralPath` calls.

Before any recursive cleanup, resolve and verify the target starts with the chosen state staging directory.

- [ ] **Step 6: Implement conservative uninstallers**

Default uninstall reads only `install-manifest.json`, removes exact managed wrappers, and preserves:

- safe Docker named volume
- host `~/.pi/agent`
- sessions
- auth
- backups

`--purge`/`-Purge` prints exact extra targets and requires an interactive `PURGE` confirmation. It refuses purge in non-interactive mode unless a separate exact `--confirm-purge=mgyoo-pi-harness` token is supplied.

- [ ] **Step 7: Run dry-run and isolated installation tests**

Run:

```sh
MGYOO_PI_DRY_RUN=1 MGYOO_PI_BIN_DIR=/tmp/mgyoo-bin MGYOO_PI_STATE_DIR=/tmp/mgyoo-state sh install.sh
```

Expected: dependency/build/wrapper operations are printed; `/tmp/mgyoo-bin` and `/tmp/mgyoo-state` are not created.

On PowerShell:

```powershell
$env:MGYOO_PI_DRY_RUN = "1"
$env:MGYOO_PI_BIN_DIR = Join-Path $env:TEMP "mgyoo-bin"
$env:MGYOO_PI_STATE_DIR = Join-Path $env:TEMP "mgyoo-state"
.\install.ps1
```

Expected: same no-write dry-run behavior.

Run: `npm test -- tests/install/install-contract.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit installers**

```sh
git add install.ps1 install.sh uninstall.ps1 uninstall.sh scripts/templates tests/install
git commit -m "feat: add cross-platform harness installers"
```

---

### Task 8: Doctor and update workflows

**Files:**
- Create: `src/commands/doctor.ts`
- Create: `src/commands/update.ts`
- Modify: `src/cli.ts`
- Modify: `install.ps1`
- Modify: `install.sh`
- Modify: `uninstall.ps1`
- Modify: `uninstall.sh`
- Create: `scripts/templates/pi-doctor.cmd`
- Create: `scripts/templates/pi-update.cmd`
- Create: `scripts/templates/pi-doctor`
- Create: `scripts/templates/pi-update`
- Modify: `tests/install/install-contract.test.ts`
- Test: `tests/commands/doctor.test.ts`
- Test: `tests/commands/update.test.ts`

**Interfaces:**
- Consumes: `ProcessRunner`, constants, and resolved paths.
- Produces: `CheckResult { id, status, summary, remedy? }`.
- Produces: `runDoctor()` and `runUpdate()` exit codes.

- [ ] **Step 1: Write failing doctor tests**

Create `tests/commands/doctor.test.ts` with a fake runner and assert:

```ts
expect(results.map((result) => result.id)).toEqual([
  "git",
  "node",
  "docker-cli",
  "docker-daemon",
  "pi-host",
  "pi-image",
  "safe-volume",
  "settings",
  "safe-boundary",
]);
```

Test that an unavailable Docker daemon returns status `fail`, remedy text containing the official Docker setup URL, and no environment variables. Test that auth checks report only `configured`/`not configured`.

- [ ] **Step 2: Write failing update tests**

Assert the update workflow:

1. calls `git status --porcelain`
2. stops if output is non-empty
3. otherwise calls `git pull --ff-only`
4. runs `npm ci --ignore-scripts`
5. runs `npm run check`
6. runs `npm run build`
7. rebuilds the pinned image
8. runs doctor

The fake runner must support captured stdout for diagnostic commands. Extend `ProcessRunner` with a separate `capture()` method returning `{ code, stdout, stderr }`; update earlier fakes and production runner.

- [ ] **Step 3: Run focused tests and observe failures**

Run: `npm test -- tests/commands/doctor.test.ts tests/commands/update.test.ts`

Expected: FAIL because doctor/update are stubs and `capture()` is absent.

- [ ] **Step 4: Implement redacted doctor checks**

Define:

```ts
export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  status: CheckStatus;
  summary: string;
  remedy?: string;
}
```

Each check invokes an argv array, caps captured output at 8 KiB, and replaces home paths with `<HOME>`. Never print `process.env`, `docker inspect` environment sections, file contents from auth, or credential values.

The safe-boundary check creates a sentinel in the current project, invokes a temporary container command that writes inside `/workspace` and confirms an unmounted host path is absent, then removes the exact sentinel file.

- [ ] **Step 5: Implement clean-tree update**

`runUpdate` must refuse:

- a dirty worktree
- detached HEAD
- a missing `origin`

It must use `git pull --ff-only`, never force checkout, reset, clean, stash, or automatic conflict resolution. Before managed wrapper/config replacement, invoke the installer’s normal backup path. On failure, print the current commit and the exact prior commit plus a non-destructive recovery instruction.

- [ ] **Step 6: Wire CLI and install the new wrappers**

Import the real handlers and extend the dispatcher:

```ts
const handlers = {
  safe: () => runSafe(args, deps),
  yolo: () => runYolo(args, deps),
  login: () => runLogin(args[0], deps),
  doctor: () => runDoctor(args, deps),
  update: () => runUpdate(args, deps),
};
```

Add the same thin wrapper pattern from Task 7 for `pi-doctor` and `pi-update`. Update both installer manifests and uninstallers so these two exact wrapper paths are managed and tested.

Run: `npm test -- tests/commands`

Expected: PASS.

Run: `npm run check`

Expected: PASS.

- [ ] **Step 7: Commit diagnostics and updates**

```sh
git add src/process.ts src/commands/doctor.ts src/commands/update.ts src/cli.ts install.ps1 install.sh uninstall.ps1 uninstall.sh scripts/templates/pi-doctor.cmd scripts/templates/pi-update.cmd scripts/templates/pi-doctor scripts/templates/pi-update tests/commands tests/install/install-contract.test.ts
git commit -m "feat: add harness doctor and safe updater"
```

---

### Task 9: Beginner-first Korean documentation and public project files

**Files:**
- Create: `README.md`
- Create: `docs/01-getting-started.md`
- Create: `docs/02-models-and-login.md`
- Create: `docs/03-safe-vs-yolo.md`
- Create: `docs/04-customizing-pi.md`
- Create: `docs/05-troubleshooting.md`
- Create: `docs/learning-roadmap.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Test: `tests/docs/docs.test.ts`

**Interfaces:**
- Consumes: final command names, paths, security boundaries, and doctor output IDs.
- Produces: complete onboarding and operations documentation.

- [ ] **Step 1: Write failing documentation coverage tests**

Create `tests/docs/docs.test.ts`:

```ts
import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const docs = [
  "README.md",
  "docs/01-getting-started.md",
  "docs/02-models-and-login.md",
  "docs/03-safe-vs-yolo.md",
  "docs/04-customizing-pi.md",
  "docs/05-troubleshooting.md",
  "docs/learning-roadmap.md",
];

it.each(docs)("%s exists and links to official Pi docs", async (path) => {
  await access(path);
  const text = await readFile(path, "utf8");
  expect(text).toContain("https://pi.dev/docs/latest");
  expect(text).toContain("2026-07-24");
});

it("explains the non-sandbox project-trust distinction", async () => {
  const text = await readFile("docs/03-safe-vs-yolo.md", "utf8");
  expect(text).toContain("project trust");
  expect(text).toContain("sandbox");
  expect(text).toContain("pi-yolo");
});
```

Add assertions for `/login`, `/model`, `Ctrl+P`, Windows, WSL, macOS, Linux, `pi-doctor`, backup restore, and credential exposure response.

- [ ] **Step 2: Run docs tests and observe missing files**

Run: `npm test -- tests/docs/docs.test.ts`

Expected: FAIL because public documentation files do not exist.

- [ ] **Step 3: Write the 10-minute README**

README order:

1. one-paragraph purpose
2. SAFE vs YOLO warning table
3. prerequisites
4. clone and install commands for PowerShell and POSIX
5. `pi-login safe`, `pi-login yolo`
6. first `pi` run and `/model`
7. `pi-doctor`
8. document map
9. security limitations
10. license

Every command must be copy-pasteable and must not contain a real token, password, username-specific home path, or undocumented replacement marker. Use `https://github.com/calm-mg/mgyoo-pi-harness.git` as the clone URL.

- [ ] **Step 4: Write platform and model guides**

`01-getting-started.md` includes Windows PowerShell, optional WSL for user `mgyoo` without embedding or requesting a password, macOS, and Linux. Docker installation links must go to official Docker documentation.

`02-models-and-login.md` explains:

- provider vs model
- subscription login vs API key
- safe and YOLO require separate login
- `/login`, `/model`, `Ctrl+P`, and thinking levels
- no fixed “best model”
- how to revoke a leaked credential

- [ ] **Step 5: Write security, customization, troubleshooting, and roadmap guides**

`03-safe-vs-yolo.md` includes a capability table and states:

- safe container sees only the workspace and its own Pi state
- outbound network is available
- prompt injection remains possible
- project trust is not a sandbox
- `pi-yolo` has host-user permissions

`04-customizing-pi.md` teaches settings → AGENTS → prompts → skills → extensions, with one small verified example per stage.

`05-troubleshooting.md` maps every doctor check ID to symptoms, commands, fixes, and backup recovery.

`learning-roadmap.md` provides day-by-day first-week exercises and later extension/subagent/automation milestones with completion criteria.

- [ ] **Step 6: Add public policy files**

Use the standard MIT license with year 2026 and copyright holder `calm-mg`.

`SECURITY.md` must instruct users not to open public issues containing tokens or private logs and to revoke exposed credentials immediately. State that extension guards are defense in depth and Docker is the safe-mode boundary.

`CONTRIBUTING.md` requires `npm run check`, platform-specific installer dry-run where relevant, no secrets, and focused commits.

- [ ] **Step 7: Run documentation and link checks**

Run: `npm test -- tests/docs/docs.test.ts`

Expected: PASS.

Run:

```sh
rg -n "(TB|TO)D|FIX.ME|sk-[A-Za-z0-9]|BEGIN .*PRIVATE KEY|password\s*[:=]" README.md docs CONTRIBUTING.md SECURITY.md
```

Expected: no matches.

- [ ] **Step 8: Commit documentation**

```sh
git add README.md docs/01-getting-started.md docs/02-models-and-login.md docs/03-safe-vs-yolo.md docs/04-customizing-pi.md docs/05-troubleshooting.md docs/learning-roadmap.md LICENSE CONTRIBUTING.md SECURITY.md tests/docs
git commit -m "docs: add Pi harness onboarding and operations guide"
```

---

### Task 10: CI, secret scanning, and end-to-end release verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Create: `scripts/check-secrets.mjs`
- Create: `scripts/check-secrets.d.mts`
- Modify: `package.json`
- Test: `tests/security/secret-scan.test.ts`

**Interfaces:**
- Consumes: all repository tests, installers, Docker image, and docs.
- Produces: `npm run check:secrets` and three-platform CI.

- [ ] **Step 1: Write a failing secret scanner test**

Create `tests/security/secret-scan.test.ts`:

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanFiles } from "../../scripts/check-secrets.mjs";

it("finds private keys and credential assignments without printing values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mgyoo-secrets-"));
  const path = join(dir, "bad.txt");
  const credential = ["API", "KEY"].join("_") + "=" + ["example", "secret", "value"].join("-");
  const privateKey = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
  await writeFile(path, `${credential}\n${privateKey}`);
  const findings = await scanFiles([path]);
  expect(findings.map((finding) => finding.rule)).toEqual([
    "credential-assignment",
    "private-key",
  ]);
  expect(JSON.stringify(findings)).not.toContain("example-secret-value");
});
```

- [ ] **Step 2: Run the scanner test and observe the missing module**

Run: `npm test -- tests/security/secret-scan.test.ts`

Expected: FAIL because the scanner does not exist.

- [ ] **Step 3: Implement a redacting repository scanner**

Create `scripts/check-secrets.mjs` exporting:

```js
export async function scanFiles(paths) {
  // Return only { path, line, rule }; never return matched text.
}
```

Rules cover private-key headers, common API-key assignments, `auth.json`, and known credential filenames. The CLI obtains tracked and untracked candidate files from `git ls-files --cached --others --exclude-standard`, ignores binary files and files larger than 1 MiB, prints only path/line/rule, and exits 1 on findings.

Create `scripts/check-secrets.d.mts` so strict TypeScript tests can import the JavaScript module:

```ts
export interface SecretFinding {
  path: string;
  line: number;
  rule: string;
}

export function scanFiles(paths: readonly string[]): Promise<SecretFinding[]>;
```

Add to `package.json`:

```json
{
  "scripts": {
    "check:secrets": "node scripts/check-secrets.mjs",
    "check": "npm run typecheck && npm test && npm run check:secrets"
  }
}
```

- [ ] **Step 4: Create three-platform CI**

`.github/workflows/ci.yml` must:

- trigger on pull requests and pushes to `main`
- grant `contents: read`
- use a Windows/macOS/Linux matrix
- install Node 24 with npm cache
- run `npm ci --ignore-scripts`
- run `npm run check`
- run `npm run build`
- run POSIX installer dry-run on macOS/Linux
- run PowerShell installer dry-run on Windows
- run Docker build and `tests/container/smoke.sh` only on Ubuntu
- never configure provider credentials

Pin Actions to reviewed major versions initially, and let Dependabot propose updates.

- [ ] **Step 5: Add controlled dependency updates**

`.github/dependabot.yml` creates weekly grouped PRs for:

- npm dependencies
- GitHub Actions

Pi remains exact-pinned in `package.json`; Dependabot proposals must not be auto-merged.

- [ ] **Step 6: Run full local verification**

Run:

```sh
npm ci --ignore-scripts
npm run check
npm run build
git diff --check
git status --short
```

Expected:

- all tests pass
- TypeScript passes
- secret scan reports zero findings
- build succeeds
- `git diff --check` has no output
- status contains only the intended Task 10 files

When Docker is available, also run:

```sh
sh tests/container/smoke.sh
```

Expected: PASS with the workspace write succeeding and the outside sentinel inaccessible.

- [ ] **Step 7: Review acceptance criteria**

Manually map the design’s 12 acceptance criteria to evidence:

1. installer dry-runs and isolated install evidence
2. safe CLI spawn test
3. Docker outside-write smoke test
4. guard unit tests
5. YOLO banner and host spawn test
6. separate volume/host paths
7. `/login` and `/model` docs tests
8. repeated isolated installer test
9. uninstall preservation contract
10. matrix CI definition and local checks
11. secret scan
12. docs coverage test

Do not mark v1 complete if any evidence is missing.

- [ ] **Step 8: Commit CI and release checks**

```sh
git add .github scripts/check-secrets.mjs scripts/check-secrets.d.mts package.json package-lock.json tests/security
git commit -m "ci: verify Pi harness across platforms"
```

- [ ] **Step 9: Perform final verification before publication**

Use `superpowers:verification-before-completion`. Run the full check suite again from a clean worktree, inspect the final commit list and diff against the design commit, and confirm no credential-bearing local files are tracked.

After verification, use the `github:yeet` workflow or another explicitly authorized GitHub publication path to create and push `calm-mg/mgyoo-pi-harness` as a public repository. If repository-creation permission is unavailable, stop after local commits and request only the missing GitHub connection step.
