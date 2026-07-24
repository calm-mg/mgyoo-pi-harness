import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { scanFiles } from "../../scripts/check-secrets.mjs";

const temporaryDirectories: string[] = [];

async function fixture(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "mgyoo-pi-secret-scan-"));
  temporaryDirectories.push(directory);

  await Promise.all(
    Object.entries(files).map(async ([name, contents]) => {
      await writeFile(path.join(directory, name), contents, "utf8");
    }),
  );

  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("secret scanner", () => {
  it("accepts ordinary documentation and source files", async () => {
    const directory = await fixture({
      "README.md": "Run pi-login and never commit credentials.",
      "example.ts": 'const settingName = "apiKey";',
    });

    expect(
      await scanFiles(directory, ["README.md", "example.ts"]),
    ).toEqual([]);
  });

  it("reports credential locations without returning the credential value", async () => {
    const credential = ["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("-");
    const providerVariable = ["OPENAI", "API", "KEY"].join("_");
    const directory = await fixture({
      "leak.env": `${providerVariable}=${credential}\n`,
    });

    const findings = await scanFiles(directory, ["leak.env"]);
    const serialized = JSON.stringify(findings);

    expect(findings).toEqual([
      { path: "leak.env", line: 1, rule: "provider-api-key" },
    ]);
    expect(serialized).not.toContain(credential);
  });

  it("detects private keys and Pi authentication files", async () => {
    const privateKeyHeader = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
    const directory = await fixture({
      "private.pem": `${privateKeyHeader}\nredacted\n`,
      "auth.json": "{}\n",
    });

    expect(await scanFiles(directory, ["private.pem", "auth.json"])).toEqual([
      { path: "auth.json", line: 1, rule: "pi-auth-file" },
      { path: "private.pem", line: 1, rule: "private-key" },
    ]);
  });

  it("ignores binary files", async () => {
    const credential = ["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("-");
    const directory = await fixture({
      "binary.dat": `\u0000${credential}`,
    });

    expect(await scanFiles(directory, ["binary.dat"])).toEqual([]);
  });
});
