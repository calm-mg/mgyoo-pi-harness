import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  renderCmdShim,
  renderPosixWrapper,
  renderPowerShellWrapper,
} from "../../scripts/render-wrappers.mjs";

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

  it("renders POSIX wrappers for paths containing shell metacharacters", () => {
    const repository = "/tmp/한글 & project|quote's";
    const rendered = renderPosixWrapper(repository, "safe");

    expect(rendered).toContain("한글 & project|quote");
    expect(rendered).toContain("'\"'\"'");
    expect(rendered).not.toContain("__REPOSITORY_ROOT__");
  });

  it("uses a path-independent CMD shim and UTF-8 PowerShell wrapper", () => {
    const repository = String.raw`C:\Users\한글 & 100% project\it's`;
    const shim = renderCmdShim("pi");
    const wrapper = renderPowerShellWrapper(repository, "safe");

    expect(shim).toContain("%~dp0pi.ps1");
    expect(shim).not.toContain(repository);
    expect(wrapper).toContain("한글 & 100% project");
    expect(wrapper).toContain("it''s");
    expect(wrapper).not.toContain("__REPOSITORY_ROOT__");
    expect(wrapper.codePointAt(0)).toBe(0xfeff);
  });

  it("validates purge targets before recursive removal", async () => {
    const posix = await readFile("uninstall.sh", "utf8");
    const windows = await readFile("uninstall.ps1", "utf8");

    expect(posix).toContain("validate_state_dir");
    expect(posix).toContain('basename "$resolved_state"');
    expect(windows).toContain("Refusing to purge home or filesystem root");
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
