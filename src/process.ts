import { spawn } from "node:child_process";

export interface RunRequest {
  command: string;
  args: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CaptureResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ProcessRunner {
  run(request: RunRequest): Promise<number>;
  capture(request: RunRequest): Promise<CaptureResult>;
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
  capture(request) {
    return new Promise((resolve, reject) => {
      const child = spawn(request.command, request.args, {
        cwd: request.cwd,
        env: request.env ?? process.env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => {
        stdout = (stdout + chunk.toString("utf8")).slice(-8192);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString("utf8")).slice(-8192);
      });
      child.once("error", reject);
      child.once("exit", (code) =>
        resolve({ code: code ?? 1, stdout, stderr }),
      );
    });
  },
};
