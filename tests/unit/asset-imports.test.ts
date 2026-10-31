import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A relative asset path handed to a component as a *string* is not rewritten by the bundler: the
// file is never emitted, the browser 404s, and the image paints nothing. That is how the brand
// mark's chef hat silently disappeared during the chain sweep — a literal <img src> became
// <Photo src="…">. Assets must be imported (or come from public/).
const ROOT = resolve(import.meta.dirname, "../..");
const SRC = join(ROOT, "src");

function vueFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...vueFiles(path));
    else if (path.endsWith(".vue")) out.push(path);
  }
  return out;
}

describe("assets reach components as imports", () => {
  it("no component receives a relative path as a plain src string", () => {
    const files = vueFiles(SRC);
    // A scan that read nothing would pass every assertion below.
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // `src="../../assets/…"` on any component tag (a `<img>` literal is fine: Vite rewrites it).
      for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)\b[^>]*?\ssrc="([^"{}]+)"/g)) {
        const [, component, value] = match;
        if (value && /^(\.{1,2}\/|\/)?(src\/)?assets\//.test(value)) {
          offenders.push(`${file}: <${component} src="${value}">`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
