#!/usr/bin/env bun
// Arms `--strict-framework` on the vendored role/pole checker without making every advisory
// warning fatal.
//
// tools/check_pvc.py supports `--fail-on warn`, but that turns *every* warning red — including
// VIEW_NO_FACT and WRAPPER_SUSPECT, which are advisory by design — and its strict TIER_SKIP rule
// also fires on the seam the same message names as the allowed home (`ui/base/**`). Editing the
// vendored script is out of bounds, so this wrapper runs it unchanged, reads its JSON, and
// enforces what the rule actually says:
//
//   * any error-level finding fails;
//   * a TIER_SKIP naming a framework package outside `ui/base/**` fails;
//   * everything else is counted and printed, never fatal.
//
// `vue-i18n` above the seam is exempt: TIER_SKIP is about consuming the framework *control*
// instead of the adaptive tier, and a Rendition translating its own copy is not doing that.
// The seam exemption is the checker's own wording ("named outside ui/base"); its primitive test
// is broader than its message.
//
// Exit: 0 clean, 1 enforced finding(s), 2 could not run (missing interpreter, bad JSON, usage).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CHECKER = join(ROOT, "tools", "check_pvc.py");
const SEAM = "ui/base/";
const EXEMPT_PACKAGES = new Set(["vue-i18n"]);

const PYTHONS = [
  join(ROOT, ".venv", "Scripts", "python.exe"),
  join(ROOT, ".venv", "bin", "python"),
];
const python =
  PYTHONS.find((candidate) => existsSync(candidate)) ??
  (process.platform === "win32" ? "python" : "python3");

const args = process.argv.slice(2).filter((arg) => arg !== "--strict-framework");

// --help and --explain are documentation, not an audit: the checker's own text is the answer.
if (args.includes("--help") || args.includes("-h") || args.includes("--explain")) {
  const result = spawnSync(python, [CHECKER, ...args], { cwd: ROOT, stdio: "inherit" });
  process.exit(result.status ?? 2);
}

const argv = [...args];
if (!argv.includes("--json")) argv.push("--json");
argv.push("--strict-framework");

const run = spawnSync(python, [CHECKER, ...argv], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (run.error) {
  console.error(`pvc-check: could not run ${python}: ${run.error.message}`);
  process.exit(2);
}
if (run.stderr) process.stderr.write(run.stderr);

if (run.status === 2) {
  // Usage error or no such root: the checker's stdout already says which.
  if (run.stdout) process.stdout.write(run.stdout);
  console.error("pvc-check: the checker could not run (exit 2)");
  process.exit(2);
}

let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  if (run.stdout) process.stdout.write(run.stdout);
  console.error("pvc-check: checker output was not JSON; refusing to claim clean");
  process.exit(2);
}
if (!report || !Array.isArray(report.findings)) {
  console.error("pvc-check: checker JSON has no findings array; refusing to claim clean");
  process.exit(2);
}

const findings = report.findings.filter((finding) => finding && typeof finding === "object");
const errors = findings.filter((finding) => finding.level === "error");
const warnings = findings.filter((finding) => finding.level !== "error");
const enforced = [];
const exempt = [];
for (const finding of warnings) {
  if (finding.code !== "TIER_SKIP") continue;
  const detail = String(finding.detail ?? "");
  const pkg = /framework package '([^']+)'/.exec(detail)?.[1] ?? "?";
  const file = String(finding.path ?? "").replace(/\\/g, "/");
  if (file.startsWith(SEAM)) exempt.push({ finding, why: "inside the seam (ui/base)" });
  else if (EXEMPT_PACKAGES.has(pkg))
    exempt.push({ finding, why: `${pkg} is a library, not a control` });
  else enforced.push(finding);
}

const tiSkip = warnings.filter((finding) => finding.code === "TIER_SKIP").length;
console.log(
  `pvc: ${errors.length} error(s), ${warnings.length} warning(s), ` +
    `${tiSkip} TIER_SKIP (${enforced.length} enforced, ${exempt.length} exempt)`,
);
for (const finding of errors) {
  console.log(`[ERROR] ${finding.path}:${finding.line}  ${finding.code} — ${finding.detail}`);
}
for (const finding of enforced) {
  console.log(`[TIER_SKIP] ${finding.path}:${finding.line}  ${finding.code} — ${finding.detail}`);
}
const reasons = new Map();
for (const { why } of exempt) reasons.set(why, (reasons.get(why) ?? 0) + 1);
for (const [why, count] of reasons) console.log(`pvc: exempt ${count} × TIER_SKIP — ${why}`);

if (errors.length + enforced.length > 0) {
  console.error(`pvc: red — ${errors.length + enforced.length} enforced finding(s)`);
  process.exit(1);
}
console.log("pvc: green — no enforced findings");
