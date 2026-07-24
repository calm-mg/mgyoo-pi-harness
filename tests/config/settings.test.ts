import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function collectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe("managed Pi settings", () => {
  for (const mode of ["safe", "yolo"]) {
    it(`${mode} trusts projects without fixing a model`, async () => {
      const raw = await readFile(`config/settings.${mode}.json`, "utf8");
      const settings = JSON.parse(raw) as Record<string, unknown>;

      expect(settings.defaultProjectTrust).toBe("always");
      expect(settings).not.toHaveProperty("defaultProvider");
      expect(settings).not.toHaveProperty("defaultModel");
      const suspiciousKeys = collectKeys(settings).filter(
        (key) =>
          /api[_-]?key|token|password/i.test(key) &&
          !["reserveTokens", "keepRecentTokens"].includes(key),
      );
      expect(suspiciousKeys).toEqual([]);
    });
  }
});
