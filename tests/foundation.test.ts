import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  HARNESS_NAME,
  IMAGE_NAME,
  PI_VERSION,
  SAFE_VOLUME,
} from "../src/constants.js";

describe("repository foundation", () => {
  it("pins Pi and stable resource names", () => {
    expect(HARNESS_NAME).toBe("mgyoo-pi-harness");
    expect(PI_VERSION).toBe("0.82.0");
    expect(IMAGE_NAME).toBe("mgyoo-pi-harness:0.82.0");
    expect(SAFE_VOLUME).toBe("mgyoo-pi-safe-agent");
  });

  it("keeps secrets and generated state out of git", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    for (const entry of [
      "node_modules/",
      "dist/",
      "auth.json",
      "sessions/",
      ".env",
      "*.pem",
      "*.key",
      "backups/",
      "diagnostics/",
    ]) {
      expect(ignore).toContain(entry);
    }
  });
});
