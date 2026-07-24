import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const lifecycleScripts = [
  "install.sh",
  "install.ps1",
  "uninstall.sh",
  "uninstall.ps1",
];

describe("installer contract", () => {
  it.each(lifecycleScripts)("%s supports isolated test locations", async (file) => {
    const text = await readFile(file, "utf8");

    expect(text).toContain("MGYOO_PI_BIN_DIR");
    expect(text).toContain("MGYOO_PI_STATE_DIR");
  });

  it("installers never elevate privileges or recursively delete", async () => {
    const files = await Promise.all([
      readFile("install.sh", "utf8"),
      readFile("install.ps1", "utf8"),
    ]);

    expect(files.join("\n")).not.toMatch(
      /\bsudo\b|rm\s+-rf|Remove-Item[^\n]+-Recurse/i,
    );
  });

  it.each(["pi", "pi-yolo", "pi-login", "pi-doctor", "pi-update"])(
    "POSIX %s wrapper forwards arguments without eval",
    async (name) => {
      const text = await readFile(`scripts/templates/${name}`, "utf8");
      expect(text).toContain("__REPOSITORY_ROOT__");
      expect(text).toContain('"$@"');
      expect(text).not.toContain("eval");
    },
  );

  it.each(["pi", "pi-yolo", "pi-login", "pi-doctor", "pi-update"])(
    "Windows %s wrapper forwards arguments",
    async (name) => {
      const text = await readFile(`scripts/templates/${name}.cmd`, "utf8");
      expect(text).toContain("__REPOSITORY_ROOT__");
      expect(text).toContain("%*");
      expect(text).not.toMatch(/Invoke-Expression/i);
    },
  );
});
