import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { IMAGE_NAME, SAFE_VOLUME } from "../constants.js";
import { buildSafeDockerArgs } from "../docker.js";
import type { RunRequest } from "../process.js";
import type { CommandDeps } from "./types.js";

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  status: CheckStatus;
  summary: string;
  remedy?: string;
}

function redact(text: string): string {
  return text.replaceAll(homedir(), "<HOME>").slice(0, 8192);
}

async function captureCheck(
  id: string,
  request: RunRequest,
  deps: CommandDeps,
  remedy?: string,
  successSummary?: string,
): Promise<CheckResult> {
  try {
    const result = await deps.runner.capture(request);
    if (result.code === 0) {
      return {
        id,
        status: "pass",
        summary: successSummary ?? redact(result.stdout.trim() || "ok"),
      };
    }
    return {
      id,
      status: "fail",
      summary: redact(result.stderr.trim() || `exit ${result.code}`),
      ...(remedy ? { remedy } : {}),
    };
  } catch (error) {
    return {
      id,
      status: "fail",
      summary: redact(error instanceof Error ? error.message : String(error)),
      ...(remedy ? { remedy } : {}),
    };
  }
}

export async function collectDoctorResults(
  deps: CommandDeps,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  results.push(
    await captureCheck(
      "git",
      { command: "git", args: ["--version"] },
      deps,
      "Install Git from https://git-scm.com/downloads",
    ),
  );
  results.push(
    await captureCheck(
      "node",
      { command: process.execPath, args: ["--version"] },
      deps,
      "Install Node.js 24 or newer from https://nodejs.org/",
    ),
  );
  results.push(
    await captureCheck(
      "docker-cli",
      { command: "docker", args: ["--version"] },
      deps,
      "Install Docker from https://docs.docker.com/get-docker/",
    ),
  );
  results.push(
    await captureCheck(
      "docker-daemon",
      { command: "docker", args: ["info", "--format", "{{.ServerVersion}}"] },
      deps,
      "Start Docker Desktop or Docker Engine: https://docs.docker.com/get-started/",
    ),
  );

  try {
    await access(deps.paths.hostPiExecutable);
    results.push({
      id: "pi-host",
      status: "pass",
      summary: "Pinned host Pi CLI is present",
    });
  } catch {
    results.push({
      id: "pi-host",
      status: "fail",
      summary: "Pinned host Pi CLI is missing",
      remedy: "Run the installer again from the harness repository.",
    });
  }

  results.push(
    await captureCheck(
      "pi-image",
      { command: "docker", args: ["image", "inspect", IMAGE_NAME] },
      deps,
      "Run the installer to build the pinned safe image.",
      "Pinned safe image is present",
    ),
  );

  const volume = await captureCheck(
    "safe-volume",
    { command: "docker", args: ["volume", "inspect", SAFE_VOLUME] },
    deps,
    undefined,
    "Safe-mode state volume is present",
  );
  results.push(
    volume.status === "fail"
      ? {
          ...volume,
          status: "warn",
          remedy: "Run `pi-login safe` once to create safe-mode state.",
        }
      : volume,
  );

  try {
    await Promise.all(
      ["safe", "yolo"].map(async (mode) => {
        const raw = await readFile(
          join(deps.paths.repositoryRoot, `config/settings.${mode}.json`),
          "utf8",
        );
        JSON.parse(raw);
      }),
    );
    results.push({
      id: "settings",
      status: "pass",
      summary: "Safe and YOLO settings are valid JSON",
    });
  } catch (error) {
    results.push({
      id: "settings",
      status: "fail",
      summary: redact(error instanceof Error ? error.message : String(error)),
      remedy: "Restore config files from Git and rerun the installer.",
    });
  }

  const probeRoot = await mkdtemp(join(tmpdir(), "mgyoo-pi-doctor-"));
  const probeWorkspace = join(probeRoot, "workspace");
  const sentinel = join(probeRoot, "outside-sentinel");
  await mkdir(probeWorkspace);
  await writeFile(sentinel, "unchanged", "utf8");
  try {
    const args = buildSafeDockerArgs({
      cwd: probeWorkspace,
      interactive: false,
      piArgs: [],
      identity: null,
    });
    const imageIndex = args.indexOf(IMAGE_NAME);
    args.splice(imageIndex, 0, "--entrypoint", "sh");
    args.push(
      "-c",
      [
        "touch /workspace/inside-probe",
        "test ! -e /workspace/../outside-sentinel",
        "test -f /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard/index.ts",
      ].join(" && "),
    );
    const boundary = await captureCheck(
      "safe-boundary",
      { command: "docker", args },
      deps,
      "Rebuild the safe image and verify Docker mount settings.",
      "Safe container boundary probe passed",
    );
    const sentinelContents = await readFile(sentinel, "utf8");
    results.push(
      sentinelContents === "unchanged"
        ? boundary
        : {
            id: "safe-boundary",
            status: "fail",
            summary: "Adjacent host sentinel changed during boundary probe",
            remedy: "Stop using safe mode and inspect Docker mount settings.",
          },
    );
  } finally {
    await rm(probeRoot, { recursive: true, force: true });
  }
  return results;
}

export async function runDoctor(
  _args: readonly string[],
  deps: CommandDeps,
): Promise<number> {
  const results = await collectDoctorResults(deps);
  for (const result of results) {
    deps.stdout.write(
      `[${result.status.toUpperCase()}] ${result.id}: ${result.summary}\n`,
    );
    if (result.remedy) deps.stdout.write(`  remedy: ${result.remedy}\n`);
  }
  return results.some((result) => result.status === "fail") ? 1 : 0;
}
