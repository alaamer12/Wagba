#!/usr/bin/env bun
// Verifies every relative markdown link in docs/ resolves to a file and, when it
// carries an anchor, to a heading that produces it. Exit 1 on any finding.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "docs");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".md") ? [full] : [];
  });
}

/** GitHub-compatible slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/ /g, "-");
}

const files = walk(ROOT);
const anchors = new Map<string, Set<string>>();
for (const file of files) {
  const set = new Set<string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^#{1,6}\s+(.*)/.exec(line);
    if (match) set.add(slug(match[1] as string));
  }
  anchors.set(file, set);
}

let broken = 0;
let total = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1]?.trim() ?? "";
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    total++;
    const [rel, hash] = href.split("#") as [string, string | undefined];
    const target = rel ? resolve(dirname(file), rel) : file;
    if (!existsSync(target)) {
      console.log(`MISSING FILE   ${relative(ROOT, file)} -> ${href}`);
      broken++;
      continue;
    }
    if (hash && anchors.has(target) && !anchors.get(target)?.has(hash)) {
      console.log(`MISSING ANCHOR ${relative(ROOT, file)} -> ${href}`);
      broken++;
    }
  }
}

console.log(`\n${files.length} docs, ${total} internal links, ${broken} broken`);
process.exit(broken === 0 ? 0 : 1);
