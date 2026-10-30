#!/usr/bin/env bun
// The markup wall. tools/states-check.ts answers "may this file consult that fact?";
// this module answers "may this file write that tag, that class, that style?".
//
// The seam is `src/ui/base/**`: the only folder that may name the framework or a native
// control. Above it the app speaks our vocabulary (`Button`, `Card`, `Photo`) and paints
// through tokens. The rules here are markup-only on purpose — imports resolve elsewhere
// (`biome.json` for `quasar`, `states-check.ts` for relative specifiers), because a third
// auditor that re-implements import resolution would drift from the two that own it.
//
// Report-only for now: every run over `src/` writes `tools/tag-migration.csv`, and the gate
// is wired by the main agent once the sweep is planned. The codes and severities are final
// now so the sweep cannot argue with them later.
//
// The rules are exercised by tests/unit/chain-rules.test.ts: one planted violation per code,
// plus controls that must stay clean, plus glob liveness. A scanner that has only ever agreed
// with a clean tree is not evidence that it runs.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  type DirectiveNode,
  type ElementNode,
  NodeTypes,
  parse as parseTemplate,
  type TemplateChildNode,
} from "@vue/compiler-dom";
import { parse as parseSfc, type SFCDescriptor } from "@vue/compiler-sfc";

const ROOT = resolve(import.meta.dirname, "..");
const MIGRATION_CSV = join(ROOT, "tools", "tag-migration.csv");

// ---------------------------------------------------------------------------------------------
// The layers. Folder prefixes under src/. `ui/base/` is the seam; everything else is above it.
// The liveness test asserts each prefix matches at least one real file — a dead prefix here
// would silently disable a wall (the `components/base/` incident in states-check.ts).
// ---------------------------------------------------------------------------------------------
export const LAYERS = [
  "ui/base/",
  "ui/adaptive/",
  "app/",
  "components/",
  "features/",
  "shared/",
  "pages/",
] as const;

// The sweep is per-file so two agents never touch one file. A finding's path is filtered by
// the batch table; files absent from every batch are still reported by an unfiltered run.
export const BATCHES: { batch: number; prefixes: string[] }[] = [
  { batch: 1, prefixes: ["src/ui/base/", "src/ui/adaptive/Button.vue"] },
  {
    batch: 2,
    prefixes: ["src/app/BackAction.vue", "src/app/_NavTab.vue", "src/app/AddMealAction.vue"],
  },
  {
    batch: 3,
    prefixes: ["src/pages/HomePage.vue", "src/pages/MyMealsPage.vue", "src/pages/AboutPage.vue"],
  },
  {
    batch: 4,
    prefixes: ["src/components/present/MealCard.vue", "src/components/present/CookRow.vue"],
  },
  { batch: 5, prefixes: ["src/features/feed/"] },
  { batch: 6, prefixes: ["src/features/profile/"] },
  { batch: 7, prefixes: ["src/features/publish/views/MealFormView/"] },
  {
    batch: 8,
    prefixes: [
      "src/features/meal/",
      "src/features/onboarding/",
      "src/shared/decorations/BrandMark.vue",
    ],
  },
  { batch: 9, prefixes: ["src/ui/adaptive/Field.vue", "src/ui/adaptive/Segmented.vue"] },
  { batch: 10, prefixes: ["src/pages/ErrorNotFound.vue"] },
];

// ---------------------------------------------------------------------------------------------
// The registry. Every code has a severity, a reason, and a document it is stated in; the
// arming test refuses a code without all three.
// ---------------------------------------------------------------------------------------------
export type Code =
  | "CONTROL_TAG_OUTSIDE_BASE"
  | "FW_TAG_OUTSIDE_BASE"
  | "QSL_CLASS_ON_ELEMENT"
  | "STYLE_BINDING_ON_SEAM"
  | "APPEARANCE_OVERRIDE_ON_SEAM"
  | "FW_NAME_IN_VOCABULARY"
  | "TEXT_TAG_OUTSIDE_BASE";

export type Severity = "error" | "warning";

export type Finding = { code: Code; file: string; detail: string; severity: Severity };

export const REGISTRY: Record<Code, { severity: Severity; summary: string; doc: string }> = {
  CONTROL_TAG_OUTSIDE_BASE: {
    severity: "error",
    summary:
      "A native control tag (button, input, img, textarea, select, label, fieldset, legend) may only be written in src/ui/base/**. Above the seam the control is consumed by name — Button, Input, Photo, Field — so behaviour and skin stay in one file. See docs/tech/structure.md §3.10.",
    doc: "docs/tech/structure.md §3.10 (control-tag wall)",
  },
  FW_TAG_OUTSIDE_BASE: {
    severity: "error",
    summary:
      "A framework tag (<q-…> or <Q…>) may only be written in src/ui/base/**. Quasar's Vite plugin injects the import at compile time, so no import lint or type-check can see this leak — only a template scan can. See docs/tech/structure.md §3.8.",
    doc: "docs/tech/structure.md §3.8 (framework wall)",
  },
  QSL_CLASS_ON_ELEMENT: {
    severity: "error",
    summary:
      'A Quasar utility class (q-*, text-h*, fullscreen, bg-*) on an element outside src/ui/base/** makes the markup depend on the framework\'s stylesheet. Only tokens that cannot be local are checked; row, col-*, flex and flex-center are deliberately exempt because class="row" is a local class in src/features/profile/views/SettingsRowsView/. See docs/tech/structure.md §3.11.',
    doc: "docs/tech/structure.md §3.11 (naming wall)",
  },
  STYLE_BINDING_ON_SEAM: {
    severity: "error",
    summary:
      "style= or :style on a tag inside a seam file (src/ui/base/**, src/ui/adaptive/**) moves appearance out of CSS and into the markup, where no token, selector, or theme can reach it. A size knob is a prop or a variant. See docs/tech/structure.md §3.9.",
    doc: "docs/tech/structure.md §3.9 (chain wall)",
  },
  APPEARANCE_OVERRIDE_ON_SEAM: {
    severity: "error",
    summary:
      "A <style> rule outside src/ui/** paints a class that is bound on a seam tag in the same file. The seam owns its skin; layout-only properties (display, gap, margin, width, position) never fire, because composing a seam is layout. See docs/tech/structure.md §3.9.",
    doc: "docs/tech/structure.md §3.9 (chain wall)",
  },
  FW_NAME_IN_VOCABULARY: {
    severity: "warning",
    summary:
      "A framework name (\\bQ[A-Z][A-Za-z]+\\b) in a script identifier outside src/ui/base/** leaks the vendor's vocabulary into our code. Comments and string literals are stripped before scanning, so prose about the framework is not a finding. Warning only: it names the smell, it does not fail the gate. See docs/tech/structure.md §3.8.",
    doc: "docs/tech/structure.md §3.8 (framework wall)",
  },
  TEXT_TAG_OUTSIDE_BASE: {
    severity: "warning",
    summary:
      "<p> and <h1>–<h4> outside src/ui/base/** bypass the type scale. Warning only on purpose: text tags are look-neutral, and forcing them in one step is a style war rather than a safety wall. Ratcheted to zero across the sweep. See docs/tech/structure.md §3.10.",
    doc: "docs/tech/structure.md §3.10 (control-tag wall)",
  },
};

// ---------------------------------------------------------------------------------------------
// The law, as data.
// ---------------------------------------------------------------------------------------------
const CONTROL_TAGS = new Set([
  "button",
  "input",
  "img",
  "textarea",
  "select",
  "label",
  "fieldset",
  "legend",
]);

// Deliberately narrow: `row`, `col-*`, `flex`, `flex-center` are omitted because they collide
// with local class names (SettingsRowsView writes class="row"). The tokens kept here cannot be
// a local class in this repo — they are Quasar's namespace, its heading scale, its fullscreen
// helper, and its background palette.
const isQslToken = (token: string) =>
  /^q-[a-z]/.test(token) ||
  /^text-h\d/.test(token) ||
  token === "fullscreen" ||
  /^bg-[a-z]/.test(token);

const SEAM_APPEARANCE =
  /^(?:background|color|border|box-shadow|opacity|font|text-decoration|padding|outline)(?:-|$)/;

const TEXT_TAGS = /^(?:p|h[1-4])$/;

export function isBasePath(path: string): boolean {
  return normalizeLayerPath(path).startsWith("ui/base/");
}

const isAdaptivePath = (path: string) => normalizeLayerPath(path).startsWith("ui/adaptive/");
const isSeamFile = (path: string) => isBasePath(path) || isAdaptivePath(path);

// Paths arrive relative to the scan root, which is `src/` in the real tree but the fixture
// root in tests. A leading `src/` is the only difference that matters to the layer tests.
const normalizeLayerPath = (path: string) =>
  path
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^src\//, "");

// ---------------------------------------------------------------------------------------------
// The seam registry: basenames of src/ui/{base,adaptive}/*.vue. Derived from the tree, never
// typed by hand — a new seam unit is registered by existing.
// ---------------------------------------------------------------------------------------------
function seamTags(): Set<string> {
  const tags = new Set<string>();
  for (const dir of ["base", "adaptive"]) {
    const folder = join(ROOT, "src", "ui", dir);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder)) {
      if (!name.endsWith(".vue")) continue;
      const base = name.slice(0, -4);
      tags.add(base);
      if (/[a-z0-9][A-Z]/.test(base)) {
        tags.add(base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase());
      }
    }
  }
  return tags;
}

// ---------------------------------------------------------------------------------------------
// Template parsing helpers.
// ---------------------------------------------------------------------------------------------
const lineAt = (source: string, offset: number) =>
  source.slice(0, Math.max(0, offset)).split("\n").length;

type ElementVisit = {
  tag: string;
  line: number;
  classes: string[];
  staticStyle: boolean;
  boundStyle: boolean;
};

function classTokens(node: ElementNode): string[] {
  const tokens: string[] = [];
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.name === "class") {
      tokens.push(...(prop.value?.content ?? "").split(/\s+/));
    }
    if (prop.type === NodeTypes.DIRECTIVE && isBind(prop, "class")) {
      // A bound class is an expression; only its string literals can name a class. Compound
      // expressions (concatenations, ternaries built by the compiler) are left alone.
      const expression = prop.exp;
      const text = expression?.type === NodeTypes.SIMPLE_EXPRESSION ? expression.content : "";
      for (const m of text.matchAll(/["'`]([^"'`]*)["'`]/g)) {
        tokens.push(...(m[1] ?? "").split(/\s+/));
      }
    }
  }
  return tokens.filter(Boolean);
}

function isBind(prop: DirectiveNode, arg: string): boolean {
  return prop.name === "bind" && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
    ? prop.arg.content === arg
    : false;
}

function hasStyleBinding(node: ElementNode): { staticStyle: boolean; boundStyle: boolean } {
  let staticStyle = false;
  let boundStyle = false;
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.name === "style") staticStyle = true;
    if (prop.type === NodeTypes.DIRECTIVE && isBind(prop, "style")) boundStyle = true;
  }
  return { staticStyle, boundStyle };
}

function eachElement(children: TemplateChildNode[], visit: (node: ElementNode) => void) {
  for (const child of children) {
    if (child.type !== NodeTypes.ELEMENT) continue;
    visit(child);
    eachElement(child.children, visit);
  }
}

function parseElements(
  descriptor: SFCDescriptor,
  source: string,
  onError: (message: string) => void,
): ElementVisit[] {
  const block = descriptor.template;
  if (!block) return [];
  const startLine = lineAt(source, source.indexOf(block.content, block.loc.start.offset));
  const templateErrors: string[] = [];
  const ast = parseTemplate(block.content, {
    comments: true,
    onError: (error) => templateErrors.push(error.message),
  });
  for (const message of templateErrors) onError(message);
  const visits: ElementVisit[] = [];
  eachElement(ast.children, (node) => {
    visits.push({
      tag: node.tag,
      line: startLine + node.loc.start.line - 1,
      classes: classTokens(node),
      ...hasStyleBinding(node),
    });
  });
  return visits;
}

// ---------------------------------------------------------------------------------------------
// Script scanning for vendor names. Comments and string literals are blanked (length and
// newlines preserved) so `// QPullToRefresh` and "QPullToRefresh" never fire, while `QBtn`
// in an identifier does. Regex literals are not recognised — they can only make the scan
// quieter, never louder, which is the safe direction for a warning.
// ---------------------------------------------------------------------------------------------
export function stripCommentsAndStrings(source: string): string {
  const out = source.split("");
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === ch) {
          j++;
          break;
        }
        j++;
      }
      blank(i, j);
      i = j;
      continue;
    }
    i++;
  }
  return out.join("");
}

// ---------------------------------------------------------------------------------------------
// CSS extraction. A rule is `prelude { declarations }`; at-rules are skipped, nested blocks
// are removed before declarations are read, and the prelude's offset keeps the report honest.
// ---------------------------------------------------------------------------------------------
type CssRule = { selector: string; declarations: string; offset: number };

export function extractCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const stack: { prelude: string; bodyStart: number; offset: number }[] = [];
  let segment = "";
  let segmentStart = 0;
  let i = 0;
  const reset = (at: number) => {
    segment = "";
    segmentStart = at;
  };
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length) {
        if (css[j] === "\\") {
          j += 2;
          continue;
        }
        if (css[j] === ch) {
          j++;
          break;
        }
        j++;
      }
      i = j;
      continue;
    }
    if (ch === "{") {
      const prelude = segment.trim();
      const lead = segment.length - segment.trimStart().length;
      stack.push({ prelude, bodyStart: i + 1, offset: segmentStart + lead });
      reset(i + 1);
      i++;
      continue;
    }
    if (ch === "}") {
      const frame = stack.pop();
      if (frame?.prelude && !frame.prelude.startsWith("@")) {
        rules.push({
          selector: frame.prelude,
          declarations: topLevelDeclarations(css.slice(frame.bodyStart, i)),
          offset: frame.offset,
        });
      }
      reset(i + 1);
      i++;
      continue;
    }
    if (ch === ";") {
      reset(i + 1);
      i++;
      continue;
    }
    segment += ch;
    i++;
  }
  return rules;
}

// Declarations directly inside a rule; nested rules (CSS nesting, @media) are dropped so a
// parent cannot borrow appearance from a child.
function topLevelDeclarations(body: string): string {
  let declarations = "";
  let depth = 0;
  for (const ch of body) {
    if (ch === "{") depth++;
    else if (ch === "}") depth = depth > 0 ? depth - 1 : 0;
    else if (depth === 0) declarations += ch;
  }
  return declarations;
}

function appearanceProperties(declarations: string): string[] {
  const found = new Set<string>();
  for (const m of declarations.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)) {
    const property = m[1] ?? "";
    if (SEAM_APPEARANCE.test(property)) found.add(property);
  }
  return [...found].sort();
}

function selectorClasses(selector: string): string[] {
  return [...selector.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1] ?? "");
}

// ---------------------------------------------------------------------------------------------
// The scan.
// ---------------------------------------------------------------------------------------------
export type ScanError = { file: string; message: string };
export type ScanResult = {
  root: string;
  filesScanned: number;
  templateFilesScanned: number;
  findings: Finding[];
  errors: ScanError[];
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

export function collectChainFindings(root: string, displayBase = dirname(root)): ScanResult {
  const findings: Finding[] = [];
  const errors: ScanError[] = [];
  const seam = seamTags();
  const push = (code: Code, file: string, detail: string) =>
    findings.push({ code, file, detail, severity: REGISTRY[code].severity });

  const files = walk(root).filter((p) => /\.(vue|ts)$/.test(p));
  let templateFilesScanned = 0;

  for (const full of files) {
    const path = relative(displayBase, full).replace(/\\/g, "/");
    const source = readFileSync(full, "utf8");
    const base = isBasePath(path);
    const seamFile = isSeamFile(path);

    let descriptor: SFCDescriptor | null = null;
    if (path.endsWith(".vue")) {
      templateFilesScanned++;
      const parsed = parseSfc(source, { filename: path });
      for (const error of parsed.errors) {
        errors.push({ file: path, message: error.message });
      }
      if (parsed.errors.length === 0) descriptor = parsed.descriptor;
    }

    // 1. Markup. A failure to parse means the markup was not read; the run refuses to claim
    //    clean (exit 2) rather than reporting a partial file as clean.
    if (descriptor) {
      const visits = parseElements(descriptor, source, (message) =>
        errors.push({ file: path, message }),
      );

      const seamClasses = new Set<string>();
      for (const visit of visits) {
        const tag = visit.tag;

        if (!base) {
          if (CONTROL_TAGS.has(tag)) {
            push("CONTROL_TAG_OUTSIDE_BASE", path, `<${tag}> at line ${visit.line}`);
          }
          if (/^q-/.test(tag) || /^Q[A-Z]/.test(tag)) {
            push("FW_TAG_OUTSIDE_BASE", path, `<${tag}> at line ${visit.line}`);
          }
          if (TEXT_TAGS.test(tag)) {
            push("TEXT_TAG_OUTSIDE_BASE", path, `<${tag}> at line ${visit.line}`);
          }
          const tokens = [...new Set(visit.classes.filter(isQslToken))];
          if (tokens.length > 0) {
            push(
              "QSL_CLASS_ON_ELEMENT",
              path,
              `${tokens.map((t) => `.${t}`).join(", ")} at line ${visit.line}`,
            );
          }
        }

        if (seamFile && (visit.staticStyle || visit.boundStyle)) {
          const bindings = [
            visit.staticStyle ? "style=" : "",
            visit.boundStyle ? ":style" : "",
          ].filter(Boolean);
          push("STYLE_BINDING_ON_SEAM", path, `${bindings.join(" + ")} at line ${visit.line}`);
        }

        // A class is "bound on a seam tag" only if the tag resolves to a seam unit.
        if (!normalizeLayerPath(path).startsWith("ui/") && seam.has(tag)) {
          for (const cls of visit.classes) seamClasses.add(cls);
        }
      }

      // 2. Appearance overrides: a style rule outside src/ui/** naming a class that sits on a
      //    seam tag in this same file. Layout-only rules never fire.
      if (seamClasses.size > 0 && !normalizeLayerPath(path).startsWith("ui/")) {
        for (const style of descriptor.styles) {
          const styleStart = lineAt(source, source.indexOf(style.content, style.loc.start.offset));
          for (const rule of extractCssRules(style.content)) {
            const named = [...new Set(selectorClasses(rule.selector))].filter((cls) =>
              seamClasses.has(cls),
            );
            if (named.length === 0) continue;
            const properties = appearanceProperties(rule.declarations);
            if (properties.length === 0) continue;
            const line = styleStart + countLines(style.content, rule.offset) - 1;
            push(
              "APPEARANCE_OVERRIDE_ON_SEAM",
              path,
              `${named.map((c) => `.${c}`).join(", ")} paints ${properties.join(", ")} at line ${line}`,
            );
          }
        }
      }
    }

    // 3. Vocabulary, script only, comments and strings stripped. A .vue file is two script
    //    blocks at most; a .ts file is one. Base is the only place the vendor may be named.
    if (!base) {
      for (const block of scriptBlocks(descriptor, path, source)) {
        const stripped = stripCommentsAndStrings(block.content);
        const seen = new Set<string>();
        for (const m of stripped.matchAll(/\bQ[A-Z][A-Za-z]+\b/g)) {
          const name = m[0];
          if (seen.has(name)) continue;
          seen.add(name);
          const line = block.startLine + countLines(stripped, m.index ?? 0) - 1;
          push("FW_NAME_IN_VOCABULARY", path, `${name} at line ${line}`);
        }
      }
    }
  }

  return {
    root,
    filesScanned: files.length,
    templateFilesScanned,
    findings: sortFindings(findings),
    errors,
  };
}

function countLines(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split("\n").length;
}

function scriptBlocks(
  descriptor: SFCDescriptor | null,
  path: string,
  source: string,
): { content: string; startLine: number }[] {
  if (!descriptor) {
    return path.endsWith(".ts") ? [{ content: source, startLine: 1 }] : [];
  }
  return [descriptor.script, descriptor.scriptSetup]
    .filter((block): block is NonNullable<typeof block> => Boolean(block))
    .map((block) => ({
      content: block.content,
      startLine: lineAt(source, source.indexOf(block.content, block.loc.start.offset)),
    }));
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.code.localeCompare(b.code) ||
      a.detail.localeCompare(b.detail),
  );
}

export function countFindings(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.code] = (counts[f.code] ?? 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------------------------
// The migration list. One row per finding; a row may only disappear with a commit that
// removes its finding. Quoted whenever a detail carries a comma.
// ---------------------------------------------------------------------------------------------
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(findings: Finding[]): string {
  const rows = sortFindings(findings).map((f) => [f.file, f.code, f.detail].map(csvCell).join(","));
  return ["path,code,detail", ...rows].join("\n") + "\n";
}

// ---------------------------------------------------------------------------------------------
// CLI. Mirrors tools/states-check.ts: --json, --explain CODE, --batch N, --fixture DIR.
// Exit 0 clean (warnings do not fail), 1 failing findings, 2 could not run.
// ---------------------------------------------------------------------------------------------
function printFindings(findings: Finding[]) {
  const counts = countFindings(findings);
  for (const code of Object.keys(counts).sort()) {
    const entry = REGISTRY[code as Code];
    console.log(`\n${code} (${entry.severity})  ×${counts[code]}`);
    for (const f of findings.filter((x) => x.code === code)) {
      console.log(`  ${f.file} — ${f.detail}`);
    }
  }
}

function batchFiles(batch: number): string[] {
  return BATCHES.find((b) => b.batch === batch)?.prefixes ?? [];
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => {
    const index = args.indexOf(name);
    return index === -1 ? null : (args[index + 1] ?? null);
  };

  const explain = value("--explain");
  if (flag("--explain")) {
    if (!explain || explain.startsWith("--")) {
      console.error("chain-check: --explain needs a rule code");
      process.exit(2);
    }
    if (!(explain in REGISTRY)) {
      console.error(`chain-check: unknown code ${explain}`);
      console.error(`  known: ${Object.keys(REGISTRY).sort().join(", ")}`);
      process.exit(2);
    }
    const entry = REGISTRY[explain as Code];
    console.log(`${explain} (${entry.severity})\n\n${entry.summary}\n\nStated in: ${entry.doc}`);
    process.exit(0);
  }

  const unknown = args.filter(
    (arg, index) =>
      arg.startsWith("--") &&
      !["--json", "--explain", "--batch", "--fixture"].includes(arg) &&
      !(index > 0 && ["--explain", "--batch", "--fixture"].includes(args[index - 1] ?? "")),
  );
  if (unknown.length > 0) {
    console.error(`chain-check: unknown option(s) ${unknown.join(" ")}`);
    process.exit(2);
  }

  const fixture = value("--fixture");
  if (flag("--fixture") && (!fixture || fixture.startsWith("--"))) {
    console.error("chain-check: --fixture needs a directory");
    process.exit(2);
  }
  const batchValue = value("--batch");
  if (flag("--batch") && (!batchValue || batchValue.startsWith("--"))) {
    console.error("chain-check: --batch needs a number");
    process.exit(2);
  }
  const batch = batchValue === null ? null : Number(batchValue);
  if (batch !== null && (!Number.isInteger(batch) || batchFiles(batch).length === 0)) {
    console.error(`chain-check: --batch expects one of ${BATCHES.map((b) => b.batch).join(", ")}`);
    process.exit(2);
  }

  const scanRoot = fixture ? resolve(fixture) : join(ROOT, "src");
  if (!existsSync(scanRoot)) {
    console.error(`chain-check: cannot scan ${scanRoot} (does not exist)`);
    process.exit(2);
  }

  const result = collectChainFindings(scanRoot, fixture ? scanRoot : ROOT);
  const filtered =
    batch === null
      ? result.findings
      : result.findings.filter((f) =>
          batchFiles(batch).some((prefix) => f.file.startsWith(prefix)),
        );
  const failing = filtered.filter((f) => f.severity === "error");

  if (!fixture && batch === null) {
    writeFileSync(MIGRATION_CSV, toCsv(result.findings));
  }

  if (flag("--json")) {
    console.log(
      JSON.stringify(
        {
          root: result.root,
          filesScanned: result.filesScanned,
          templateFilesScanned: result.templateFilesScanned,
          findings: filtered,
          counts: countFindings(filtered),
          errors: result.errors,
        },
        null,
        2,
      ),
    );
  } else {
    printFindings(filtered);
    console.log(
      `\nchain-check: ${filtered.length} finding(s) across ${Object.keys(countFindings(filtered)).length} code(s), ${result.filesScanned} file(s) scanned` +
        (fixture
          ? " (fixture)"
          : batch === null
            ? ` → ${relative(ROOT, MIGRATION_CSV).replace(/\\/g, "/")}`
            : ` (batch ${batch})`),
    );
    const warnings = filtered.filter((f) => f.severity === "warning").length;
    if (warnings > 0) console.log(`  ${warnings} warning(s) — reported, never failing`);
    for (const error of result.errors) {
      console.error(`  unparsable: ${error.file} — ${error.message}`);
    }
  }

  // A scanner that read nothing is not a clean scanner.
  if (result.errors.length > 0 || result.templateFilesScanned === 0 || result.filesScanned === 0) {
    if (flag("--json")) {
      console.error("chain-check: could not run — unparsable file or nothing scanned");
    }
    process.exit(2);
  }
  process.exit(fixture ? (filtered.length > 0 ? 1 : 0) : failing.length > 0 ? 1 : 0);
}
