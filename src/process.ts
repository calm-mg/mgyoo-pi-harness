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
