import type { HarnessPaths } from "../paths.js";
import type { ProcessRunner } from "../process.js";

export interface TextSink {
  write(chunk: string): unknown;
}

export interface CommandDeps {
  runner: ProcessRunner;
  stdout: TextSink;
  stderr: TextSink;
  cwd: string;
  paths: HarnessPaths;
}
