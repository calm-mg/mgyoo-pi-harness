import { runLogin } from "./commands/login.js";
import { runSafe } from "./commands/safe.js";
import type { CommandDeps } from "./commands/types.js";
import { runYolo } from "./commands/yolo.js";
import { HARNESS_NAME, PI_VERSION } from "./constants.js";
import { resolveHarnessPaths } from "./paths.js";
import { systemRunner } from "./process.js";

const [command = "safe", ...args] = process.argv.slice(2);
const deps: CommandDeps = {
  runner: systemRunner,
  stdout: process.stdout,
  stderr: process.stderr,
  cwd: process.cwd(),
  paths: resolveHarnessPaths(import.meta.url),
};

async function main(): Promise<number> {
  if (command === "--version") {
    console.log(`${HARNESS_NAME} (Pi ${PI_VERSION})`);
    return 0;
  }
  if (command === "--help") {
    console.log(`Usage: ${HARNESS_NAME} [safe|yolo|login] [args...]`);
    return 0;
  }
  if (command === "safe") return runSafe(args, deps);
  if (command === "yolo") return runYolo(args, deps);
  if (command === "login") return runLogin(args[0], deps);

  console.error(`Unknown command: ${command}. Use safe, yolo, or login.`);
  return 2;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
