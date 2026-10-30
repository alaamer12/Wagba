import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Colour lives in exactly one place. `tokens.scss` is the map; `app.scss` emits it as custom
// properties and `quasar.variables.scss` feeds Quasar's compile-time theme from it. A literal in
// either consumer reintroduces the second truth this test exists to prevent.

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const tokensSource = read("src/css/tokens.scss");
const appSource = read("src/css/app.scss");
const quasarSource = read("src/css/quasar.variables.scss");

const tokenEntries = [...tokensSource.matchAll(/"([a-z-]+)":\s*([^,\n]+),/g)].map((m) => ({
  name: m[1] ?? "",
  value: (m[2] ?? "").trim(),
}));

const quasarBindings = [
  ...quasarSource.matchAll(/\$([a-z-]+):\s*map\.get\(tokens\.\$tokens,\s*"([a-z-]+)"\)/g),
].map((m) => ({ variable: m[1] ?? "", token: m[2] ?? "" }));

describe("one palette", () => {
  it("reads a non-empty token map from tokens.scss", () => {
    // A parser that silently matches nothing would make every assertion below vacuous.
    expect(tokenEntries.length).toBeGreaterThanOrEqual(10);
    for (const entry of tokenEntries) expect(entry.value).not.toBe("");
  });

  it("emits every token as a custom property", () => {
    expect(appSource).toContain("@each $name, $value in tokens.$tokens");
    expect(appSource).toContain("--#{$name}");
    // No colour may be written literally in the emitted block: the block exists to derive them.
    const rootBlock = appSource.slice(
      appSource.indexOf(":root"),
      appSource.indexOf("--radius-card"),
    );
    for (const entry of tokenEntries) {
      expect(rootBlock).not.toContain(entry.value);
    }
  });

  it("binds Quasar's palette to tokens, never to literals", () => {
    const variables = [
      "primary",
      "secondary",
      "accent",
      "dark",
      "dark-page",
      "positive",
      "negative",
      "info",
      "warning",
    ];
    expect(quasarBindings.map((b) => b.variable).sort()).toEqual([...variables].sort());
    const names = new Set(tokenEntries.map((t) => t.name));
    for (const binding of quasarBindings) expect(names.has(binding.token)).toBe(true);
    expect(quasarSource).not.toMatch(/:\s*(#[0-9a-f]{3,8}|rgb\()/i);
  });
});
