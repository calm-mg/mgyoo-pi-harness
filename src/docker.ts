import { IMAGE_NAME, SAFE_VOLUME } from "./constants.js";

export interface SafeRunInput {
  cwd: string;
  interactive: boolean;
  piArgs: readonly string[];
  identity?: HostIdentity | null;
}

export interface HostIdentity {
  uid: number;
  gid: number;
}

function detectHostIdentity(): HostIdentity | null {
  if (typeof process.getuid !== "function" || typeof process.getgid !== "function") {
    return null;
  }
  return { uid: process.getuid(), gid: process.getgid() };
}

function identityArgs(identity: HostIdentity | null): string[] {
  if (!identity || identity.uid === 0) return [];
  return [
    "--env",
    `MGYOO_HOST_UID=${identity.uid}`,
    "--env",
    `MGYOO_HOST_GID=${identity.gid}`,
  ];
}

export function buildSafeDockerArgs(input: SafeRunInput): string[] {
  const identity =
    input.identity === undefined ? detectHostIdentity() : input.identity;
  return [
    "run",
    "--rm",
    ...(input.interactive ? ["-it"] : []),
    ...identityArgs(identity),
    "--mount",
    `type=bind,source=${input.cwd},target=/workspace`,
    "--mount",
    `type=volume,source=${SAFE_VOLUME},target=/pi-agent`,
    "--workdir",
    "/workspace",
    IMAGE_NAME,
    ...input.piArgs,
  ];
}

export function buildSafeLoginDockerArgs(
  interactive: boolean,
  identity: HostIdentity | null = detectHostIdentity(),
): string[] {
  return [
    "run",
    "--rm",
    ...(interactive ? ["-it"] : []),
    ...identityArgs(identity),
    "--mount",
    `type=volume,source=${SAFE_VOLUME},target=/pi-agent`,
    IMAGE_NAME,
  ];
}
