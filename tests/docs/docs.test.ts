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

describe("beginner documentation", () => {
  it.each(docs)("%s exists and cites current official Pi docs", async (path) => {
    await access(path);
    const text = await readFile(path, "utf8");
    expect(text).toContain("https://pi.dev/docs/latest");
    expect(text).toContain("2026-07-24");
  });

  it("explains model login and selection", async () => {
    const text = await readFile("docs/02-models-and-login.md", "utf8");
    for (const term of ["/login", "/model", "Ctrl+P", "OpenAI", "Anthropic"]) {
      expect(text).toContain(term);
    }
  });

  it("explains the non-sandbox project-trust distinction", async () => {
    const text = await readFile("docs/03-safe-vs-yolo.md", "utf8");
    expect(text).toContain("project trust");
    expect(text).toContain("sandbox");
    expect(text).toContain("pi-yolo");
    expect(text).toContain("outbound network");
  });

  it("covers every supported platform and diagnostics", async () => {
    const gettingStarted = await readFile(
      "docs/01-getting-started.md",
      "utf8",
    );
    for (const term of ["Windows", "WSL", "mgyoo", "macOS", "Linux"]) {
      expect(gettingStarted).toContain(term);
    }
    const troubleshooting = await readFile(
      "docs/05-troubleshooting.md",
      "utf8",
    );
    expect(troubleshooting).toContain("pi-doctor");
    expect(troubleshooting).toContain("backup");
  });

  it("documents credential exposure response", async () => {
    const security = await readFile("SECURITY.md", "utf8");
    expect(security).toContain("revoke");
    expect(security).toContain("공개 이슈");
    expect(security).toContain("Docker");
  });
});
