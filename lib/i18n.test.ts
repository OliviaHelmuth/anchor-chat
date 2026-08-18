import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";

// Catches a missing/extra translation key at test time instead of a blank
// string or a crash showing up live in one locale only.
function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectKeyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("i18n dictionaries", () => {
  it("DE and EN expose exactly the same set of translation keys", () => {
    const deKeys = collectKeyPaths(dictionaries.de).sort();
    const enKeys = collectKeyPaths(dictionaries.en).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("no translation value is an empty string", () => {
    for (const locale of ["de", "en"] as const) {
      const paths = collectKeyPaths(dictionaries[locale]);
      for (const path of paths) {
        const value = path.split(".").reduce<unknown>((obj, key) => (obj as never)[key], dictionaries[locale]);
        expect(value, `${locale}.${path} should not be empty`).not.toBe("");
      }
    }
  });
});
