import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface HarnessPaths {
  repositoryRoot: string;
  hostPiExecutable: string;
  hostAgentDir: string;
}

export function resolveHarnessPaths(metaUrl: string): HarnessPaths {
  const repositoryRoot = resolve(dirname(fileURLToPath(metaUrl)), "../..");
  return {
    repositoryRoot,
    hostPiExecutable: join(
      repositoryRoot,
      "node_modules",
      "@earendil-works",
      "pi-coding-agent",
      "dist",
      "cli.js",
    ),
    hostAgentDir:
      process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
  };
}
