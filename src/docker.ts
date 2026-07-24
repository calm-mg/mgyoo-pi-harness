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

export function buildSafeLoginDockerArgs(interactive: boolean): string[] {
  return [
    "run",
    "--rm",
    ...(interactive ? ["-it"] : []),
    "--mount",
    `type=volume,source=${SAFE_VOLUME},target=/root/.pi/agent`,
    IMAGE_NAME,
  ];
}
