import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BATCHES,
  type Code,
  collectChainFindings,
  LAYERS,
  REGISTRY,
  type ScanResult,
  toCsv,
} from "../../tools/chain-check";

// The markup wall is itself code, so it gets the same treatment as the app: every code has a
// planted violation that must be refused, every control shape must be left alone, and every
// glob in the tool and in biome must name something real. A checker that has only ever agreed
// with a clean tree is not evidence that it runs — an empty offender list must never be able
// to mean "the scanner read nothing".

const ROOT = resolve(import.meta.dirname, "../..");

// One planted violation per registered code, all in one tree so a separate CLI invocation can
// prove the fixture run fails as a whole (exit 1) as well as per code.
const FIXTURE: Record<string, string> = {
  "pages/FrameworkPage.vue": `<template>
  <div><q-btn label="go" /></div>
</template>
`,
  "components/present/NativeRow.vue": `<template>
  <button type="button">go</button>
</template>
`,
  "pages/UtilityPage.vue": `<template>
  <div class="q-pa-md bg-blue">styled by the framework</div>
</template>
`,
  "ui/adaptive/Sized.vue": `<template>
  <Button :style="{ width: '1px' }">sized in the markup</Button>
</template>
`,
  "pages/PaintedPage.vue": `<template>
  <Button class="painted">painted from outside</Button>
</template>
<style scoped>
.painted {
  display: flex;
  background: red;
}
</style>
`,
  "features/feed/behaviour/useFrameworkName.ts": `export const widget = QBtn;
`,
  "components/present/ProseBlock.vue": `<template>
  <p>prose outside the type scale</p>
</template>
`,

  // Controls: shapes no rule may touch.
  "components/present/SeamButton.vue": `<script setup lang="ts">
import Button from "../../ui/adaptive/Button.vue";
</script>
<template>
  <Button class="row">ours by name</Button>
</template>
`,
  "ui/base/NativeButton.vue": `<template>
  <button type="button">the seam owns the native</button>
</template>
`,
  "components/present/MathIf.vue": `<script setup lang="ts">
const a = 1;
const b = 2;
</script>
<template>
  <div v-if="a < b">less-than is an expression, not a tag</div>
</template>
`,
  "components/present/StyleWord.vue": `<template>
  <div>a selector named button is CSS, not markup</div>
</template>
<style scoped>
button {
  color: red;
}
</style>
`,
  // The vendor-name rule matches Q + a Capitalised word. An all-caps constant is not the vendor,
  // and flagging it would train people to ignore the warning.
  "features/publish/behaviour/quality.ts": `const QUALITY = 0.8;
export { QUALITY };
`,
  "components/present/CommentedFramework.vue": `<script setup lang="ts">
// QBtn is allowed in prose; so is "QPullToRefresh".
const label = "QPullToRefresh";
</script>
<template>
  <!-- <q-btn label="commented" /> QInput -->
  <div>{{ label }}</div>
</template>
`,
  "features/profile/views/SettingsRowsView/LocalRow.vue": `<template>
  <Card class="row">row is a local class here</Card>
</template>
<style scoped>
.row {
  display: flex;
  gap: var(--space-2);
}
</style>
`,
};

const PLANTED: Record<Code, string> = {
  CONTROL_TAG_OUTSIDE_BASE: "components/present/NativeRow.vue",
  FW_TAG_OUTSIDE_BASE: "pages/FrameworkPage.vue",
  QSL_CLASS_ON_ELEMENT: "pages/UtilityPage.vue",
  STYLE_BINDING_ON_SEAM: "ui/adaptive/Sized.vue",
  APPEARANCE_OVERRIDE_ON_SEAM: "pages/PaintedPage.vue",
  FW_NAME_IN_VOCABULARY: "features/feed/behaviour/useFrameworkName.ts",
  TEXT_TAG_OUTSIDE_BASE: "components/present/ProseBlock.vue",
};

const CONTROLS = [
  "components/present/SeamButton.vue",
  "ui/base/NativeButton.vue",
  "components/present/MathIf.vue",
  "components/present/StyleWord.vue",
  "components/present/CommentedFramework.vue",
  "features/profile/views/SettingsRowsView/LocalRow.vue",
];

let dir = "";
let fixture: ScanResult;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "wagba-chain-"));
  for (const [path, content] of Object.entries(FIXTURE)) {
    const full = join(dir, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  fixture = collectChainFindings(dir, dir);
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const codesFor = (file: string) =>
  fixture.findings
    .filter((f) => f.file === file)
    .map((f) => f.code)
    .sort();

// --- glob liveness ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  ".git",
  ".venv",
  "android",
  "artifacts",
  "dist",
  "node_modules",
  "pocketbase",
  "scratch",
]);

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    SKIP_DIRS.has(entry.name)
      ? []
      : entry.isDirectory()
        ? walk(join(dir, entry.name))
        : [join(dir, entry.name)],
  );

const repoFiles = () => walk(ROOT).map((p) => relative(ROOT, p).replace(/\\/g, "/"));

function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i] ?? "";
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          out += "(?:.*/)?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^/]*";
      }
    } else if ("\\^$+.()|{}[]".includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return new RegExp(`${out}$`);
}

const matchesAnything = (files: string[], glob: string) => {
  const bare = glob.replace(/^!/, "");
  if (existsSync(join(ROOT, bare))) return true;
  const re = globToRegExp(bare);
  return files.some((file) => re.test(file));
};

describe("glob liveness — a prefix that matches nothing is a disabled wall", () => {
  const files = repoFiles();

  it.each(LAYERS.map((layer) => [layer]))("src/%s matches real files", (layer) => {
    expect(files.some((file) => file.startsWith(`src/${layer}`))).toBe(true);
  });

  it("every biome files.includes entry matches something real", () => {
    const biome = JSON.parse(readFileSync(join(ROOT, "biome.json"), "utf8")) as {
      files: { includes: string[] };
    };
    const dead = biome.files.includes.filter((entry) => !matchesAnything(files, entry));
    expect(dead).toEqual([]);
  });

  it("every biome override include matches something real", () => {
    const biome = JSON.parse(readFileSync(join(ROOT, "biome.json"), "utf8")) as {
      overrides: { includes: string[] }[];
    };
    const dead = biome.overrides
      .flatMap((override) => override.includes)
      .filter((entry) => !matchesAnything(files, entry));
    expect(dead).toEqual([]);
  });

  it("has exactly the ten sweep batches and every prefix names a real file", () => {
    expect(BATCHES.map((b) => b.batch)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const dead = BATCHES.flatMap((batch) =>
      batch.prefixes.filter(
        (prefix) =>
          !files.some((file) => file.startsWith(prefix)) && !existsSync(join(ROOT, prefix)),
      ),
    );
    expect(dead).toEqual([]);
  });
});

// --- one planted violation per code ---------------------------------------------------------

describe("every code refuses its planted violation", () => {
  it.each(Object.entries(PLANTED))("%s is reported for %s", (code, file) => {
    expect(codesFor(file)).toContain(code);
  });

  it("the fixture run fails through the real CLI (exit 1)", () => {
    const run = spawnSync("bun", ["tools/chain-check.ts", "--fixture", dir], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    for (const code of Object.keys(PLANTED)) expect(run.stdout).toContain(code);
  });

  it("reports exactly the planted findings and nothing else", () => {
    expect(fixture.findings).toHaveLength(Object.keys(PLANTED).length);
    expect(fixture.findings.map((f) => f.code).sort()).toEqual(
      Object.keys(PLANTED).sort() as Code[],
    );
  });
});

describe("refuses to call an unread tree clean", () => {
  it("exits 2 when the scan read no template at all", () => {
    const empty = mkdtempSync(join(tmpdir(), "wagba-chain-empty-"));
    try {
      const run = spawnSync("bun", ["tools/chain-check.ts", "--fixture", empty], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(run.status).toBe(2);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("exits 2 on an unparsable template instead of reporting it clean", () => {
    const broken = mkdtempSync(join(tmpdir(), "wagba-chain-broken-"));
    try {
      mkdirSync(join(broken, "pages"), { recursive: true });
      writeFileSync(join(broken, "pages", "BrokenPage.vue"), "<template><div></span></template>\n");
      const run = spawnSync("bun", ["tools/chain-check.ts", "--fixture", broken], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(run.status).toBe(2);
      expect(run.stderr).toContain("unparsable");
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }
  });
});

// --- controls --------------------------------------------------------------------------------

describe("leaves the correctly shaped files alone", () => {
  it.each(CONTROLS)("%s has no finding", (file) => {
    expect(codesFor(file)).toEqual([]);
  });
});

// --- registry integrity ----------------------------------------------------------------------

describe("registry integrity", () => {
  it("has a fixture, a severity and a doc for every code", () => {
    expect(Object.keys(PLANTED).sort()).toEqual(Object.keys(REGISTRY).sort());
    for (const [code, entry] of Object.entries(REGISTRY)) {
      expect(entry.severity === "error" || entry.severity === "warning").toBe(true);
      const doc = entry.doc.match(/docs\/[\w./-]+\.md/)?.[0];
      expect(doc, `${code} must name a doc file`).toBeTruthy();
      expect(existsSync(join(ROOT, doc ?? "")), `${code} names ${doc}`).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(40);
    }
  });

  it("--explain names a doc for every code and refuses an unknown code", () => {
    for (const code of Object.keys(REGISTRY)) {
      const run = spawnSync("bun", ["tools/chain-check.ts", "--explain", code], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(run.status).toBe(0);
      expect(run.stdout).toMatch(/docs\/[\w./-]+\.md/);
    }
    const unknown = spawnSync("bun", ["tools/chain-check.ts", "--explain", "NOT_A_CODE"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(unknown.status).toBe(2);
  });
});

// --- the real tree, once ---------------------------------------------------------------------

describe("the whole run over the real tree", () => {
  it("writes a CSV that equals the findings it reported", () => {
    const run = spawnSync("bun", ["tools/chain-check.ts", "--json"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    // Errors in the tree are findings (exit 1); exit 2 would mean the scanner could not read.
    expect(run.status).not.toBe(2);
    const report = JSON.parse(run.stdout) as {
      filesScanned: number;
      templateFilesScanned: number;
      findings: ScanResult["findings"];
    };
    expect(report.filesScanned).toBeGreaterThan(0);
    expect(report.templateFilesScanned).toBeGreaterThan(0);
    const csv = readFileSync(join(ROOT, "tools/tag-migration.csv"), "utf8");
    expect(csv).toBe(toCsv(report.findings));
    expect(report.findings.every((f) => f.code in REGISTRY)).toBe(true);
  });

  it("never reports a code the registry does not know", () => {
    expect(fixture.findings.every((f) => f.code in REGISTRY)).toBe(true);
  });
});
