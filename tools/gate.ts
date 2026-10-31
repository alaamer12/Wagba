#!/usr/bin/env bun
// The one command that decides whether the repo is healthy. Every step writes to
// artifacts/logs/<step>.log; the servers are always torn down, even on failure, and every run
// leaves artifacts/gate-verdict.json plus one line in artifacts/logs/gate.log — including a
// run that crashed before it could finish. A verdict that only exists when nothing went wrong
// is not a verdict.
//
// The run is pessimistic while it is in flight: the file is written before the first step with
// every step pending and the verdict red, updated after each step, and only turned green when
// the last step passed. Read it mid-run and it says "red"; kill the process and it still says
// what ran, what failed, and which bundle the run built.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ARTIFACTS = join(ROOT, "artifacts");
const LOGS = join(ARTIFACTS, "logs");
const LOGS_REL = "artifacts/logs";
const VERDICT_FILE = join(ARTIFACTS, "gate-verdict.json");
const GATE_LOG = join(LOGS, "gate.log");
const DIST_INDEX = join(ROOT, "dist", "spa", "index.html");
const SPA_PORT = 9100;
const PB_PORT = 8090;
mkdirSync(LOGS, { recursive: true });

type StepStatus = "pending" | "running" | "pass" | "fail" | "skipped" | "crash" | "interrupted";
type VerdictState = "green" | "red" | "crashed" | "interrupted";

type StepDef = { name: string; run: () => number | Promise<number> };

type StepRecord = {
  name: string;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
  logs: string[];
};

type BundleFingerprint = {
  file: string;
  sha256: string;
  bytes: number;
  mtime: string;
  entry: { file: string; sha256: string; bytes: number } | null;
};

type ServedFingerprint = {
  url: string;
  sha256: string;
  matches: boolean;
  server: "this-run" | "survivor";
};

type PortReport = {
  port: number;
  ok: boolean;
  killed: number[];
  remaining: number[];
  error: string | null;
};

type TeardownReport = {
  ok: boolean;
  serverPid: number | null;
  serverExit: string | null;
  pbStop: { exitCode: number | null; log: string };
  ports: PortReport[];
};

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");
const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

// The static server the e2e steps run against. It must be the child of this run: a detached
// survivor from an earlier gate answers on the same port and the suite then tests a bundle that
// no longer matches the source. Held in an object so the teardown sees the declared type rather
// than narrowing the initializer away.
const harness: { server: ReturnType<typeof spawn> | null; pid: number | null } = {
  server: null,
  pid: null,
};

// What the build wrote and what the server answered. Recorded in the verdict so a green run
// names the exact bytes it certified.
const observed: { bundle: BundleFingerprint | null; served: ServedFingerprint | null } = {
  bundle: null,
  served: null,
};

// The step currently executing, so `sh` can attach its log files to the right record.
let active: StepRecord | null = null;

function sh(cmd: string, args: string[], log: string, env?: Record<string, string>): number {
  const out: string[] = [];
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: false,
    cwd: ROOT,
    windowsHide: true,
  });
  if (result.error) out.push(`spawn failed: ${result.error.message}`);
  out.push(result.stdout ?? "", result.stderr ?? "");
  writeFileSync(join(LOGS, `${log}.log`), out.join("\n"));
  active?.logs.push(`${LOGS_REL}/${log}.log`);
  const status = result.status ?? 1;
  if (status !== 0) {
    const why = result.error ? result.error.message : `exit ${status}`;
    console.error(`  ${cmd} ${args.join(" ")} → ${why} (${LOGS_REL}/${log}.log)`);
  }
  return status;
}

// ------------------------------------------------------------------ bundle fingerprints

function bundleFingerprint(): BundleFingerprint | null {
  try {
    const stat = statSync(DIST_INDEX);
    const html = readFileSync(DIST_INDEX);
    const match = /<script\b[^>]*\bsrc="([^"]+)"/i.exec(html.toString("utf8"));
    let entry: BundleFingerprint["entry"] = null;
    const src = match?.[1];
    if (src) {
      const rel = src.replace(/^\.?\//, "").split("?")[0] ?? "";
      const spaRoot = join(ROOT, "dist", "spa");
      const file = resolve(spaRoot, rel);
      if (rel !== "" && file.startsWith(`${spaRoot}${sep}`) && existsSync(file)) {
        const bytes = readFileSync(file);
        entry = {
          file: relative(ROOT, file).replace(/\\/g, "/"),
          sha256: sha256(bytes),
          bytes: bytes.length,
        };
      }
    }
    return {
      file: "dist/spa/index.html",
      sha256: sha256(html),
      bytes: html.length,
      mtime: stat.mtime.toISOString(),
      entry,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ port inspection

// PIDs listening on `port`, read from the OS. netstat is the only listing Windows ships; the
// previous teardown ran it and threw the answer away, which is how a survivor survived.
function listListeners(port: number): { pids: number[]; error: string | null } {
  if (process.platform === "win32") {
    const result = spawnSync("cmd", ["/c", "netstat -ano"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.error) return { pids: [], error: result.error.message };
    if (result.status !== 0) return { pids: [], error: `netstat exited ${result.status ?? "?"}` };
    const pids = new Set<number>();
    for (const line of (result.stdout ?? "").split(/\r?\n/)) {
      // Column-wise rather than "… LISTENING <pid>": the state word is localised on Windows,
      // and a client's connection to this port has an ephemeral *local* port, so only the
      // server side matches. UDP rows have no state column; the last column is still the pid.
      const cols = line.trim().split(/\s+/);
      if (cols.length < 4) continue;
      const proto = (cols[0] ?? "").toUpperCase();
      if (!proto.startsWith("TCP") && !proto.startsWith("UDP")) continue;
      const localPort = Number(/:(\d+)$/.exec(cols[1] ?? "")?.[1] ?? "");
      const pid = Number(cols[cols.length - 1] ?? "");
      if (localPort !== port || !Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      pids.add(pid);
    }
    return { pids: [...pids], error: null };
  }
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  });
  if (result.error) return { pids: [], error: result.error.message };
  const pids = (result.stdout ?? "")
    .split(/\s+/)
    .map(Number)
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  return { pids: [...new Set(pids)], error: null };
}

function killPid(pid: number): string | null {
  try {
    process.kill(pid, "SIGTERM");
    return null;
  } catch (first) {
    if (process.platform === "win32") {
      // A process started elevated or in another session refuses SIGTERM; taskkill is the
      // documented way out, and a failure there is reported rather than swallowed.
      const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        encoding: "utf8",
        windowsHide: true,
      });
      if (result.status === 0) return null;
      return result.error?.message ?? (result.stderr || `taskkill exited ${result.status}`).trim();
    }
    return message(first);
  }
}

// Kill whatever listens on `port`, then re-read the listener table until the port is empty or
// the wait is over. The second read is the report: "kill attempted" is not "port released".
async function freePort(port: number): Promise<PortReport> {
  const first = listListeners(port);
  const report: PortReport = {
    port,
    ok: false,
    killed: [],
    remaining: first.pids,
    error: first.error,
  };
  if (first.error !== null) return report;
  for (const pid of first.pids) {
    const failure = killPid(pid);
    if (failure === null) report.killed.push(pid);
    else report.error = `pid ${pid}: ${failure}`;
  }
  let remaining = first.pids;
  let inspectError: string | null = null;
  for (let attempt = 0; attempt < 20 && first.pids.length > 0; attempt++) {
    await sleep(250);
    const again = listListeners(port);
    remaining = again.pids;
    if (again.error !== null) {
      inspectError = again.error;
      break;
    }
    if (remaining.length === 0) break;
  }
  report.remaining = remaining;
  // The final listener read decides: a pid that vanished between netstat and kill is free,
  // not a failure, but a listener table that cannot be read is never reported as free.
  report.ok = inspectError === null && remaining.length === 0;
  report.error = inspectError ?? report.error;
  return report;
}

// Synchronous, best-effort variant for the crash path: write the verdict, then try to leave the
// ports usable. It cannot wait, so a port that is still dying is reported as such.
function syncFreePort(port: number): PortReport {
  const first = listListeners(port);
  const report: PortReport = {
    port,
    ok: false,
    killed: [],
    remaining: first.pids,
    error: first.error,
  };
  if (first.error !== null) return report;
  for (const pid of first.pids) {
    if (killPid(pid) === null) report.killed.push(pid);
  }
  const again = listListeners(port);
  report.remaining = again.pids;
  report.error = again.error;
  report.ok = again.error === null && again.pids.length === 0;
  return report;
}

async function stopHarness(): Promise<{ pid: number | null; exit: string | null }> {
  const child = harness.server;
  if (!child) return { pid: harness.pid, exit: null };
  const pid = child.pid ?? null;
  let exit: string | null;
  if (child.exitCode !== null || child.signalCode !== null) {
    exit = `already exited (code ${child.exitCode}, signal ${child.signalCode})`;
  } else {
    const gone = new Promise<void>((done) => {
      child.once("exit", () => done());
    });
    try {
      child.kill();
    } catch {
      // The netstat sweep below is the authority; a failed kill is retried there.
    }
    await Promise.race([gone, sleep(3000)]);
    exit =
      child.exitCode === null && child.signalCode === null
        ? "still running after kill"
        : `exit ${child.exitCode ?? child.signalCode}`;
  }
  harness.server = null;
  harness.pid = null;
  return { pid, exit };
}

function writePbStopLog(stdout: string | null, stderr: string | null, note: string): string {
  const log = `${LOGS_REL}/db-stop-teardown.log`;
  writeFileSync(join(LOGS, "db-stop-teardown.log"), `${stdout ?? ""}${stderr ?? ""}${note}`);
  return log;
}

async function teardownAll(): Promise<TeardownReport> {
  const server = await stopHarness();
  const sp = await freePort(SPA_PORT);
  // PocketBase stops itself first so it can remove its pid file; the port check proves it.
  const stop = spawnSync("bun", ["tools/pb.mjs", "stop"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  const pbLog = writePbStopLog(
    stop.stdout,
    stop.stderr,
    stop.error ? `\nspawn failed: ${stop.error.message}` : "",
  );
  const pb = await freePort(PB_PORT);
  const ports = [sp, pb];
  return {
    ok: ports.every((p) => p.ok),
    serverPid: server.pid,
    serverExit: server.exit,
    pbStop: { exitCode: stop.status, log: pbLog },
    ports,
  };
}

function emergencyTeardown(): TeardownReport {
  const pid = harness.server?.pid ?? harness.pid;
  try {
    harness.server?.kill();
  } catch {
    // Reported through the port table instead.
  }
  harness.server = null;
  harness.pid = null;
  const stop = spawnSync("bun", ["tools/pb.mjs", "stop"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
  });
  const pbLog = writePbStopLog(
    stop.stdout,
    stop.stderr,
    stop.error ? `\nspawn failed: ${stop.error.message}` : "",
  );
  const ports = [syncFreePort(SPA_PORT), syncFreePort(PB_PORT)];
  return {
    ok: ports.every((p) => p.ok),
    serverPid: pid,
    serverExit: "emergency teardown (no wait)",
    pbStop: { exitCode: stop.status, log: pbLog },
    ports,
  };
}

// ------------------------------------------------------------------ the steps

const steps: StepDef[] = [
  { name: "biome", run: () => sh("bunx", ["biome", "check"], "biome") },
  // The markup wall: the only place a native control tag or a framework name may appear is
  // src/ui/base/**. Hard-zero now that the sweep has emptied the debt; text tags stay warnings.
  { name: "chain", run: () => sh("bun", ["tools/chain-check.ts"], "chain") },
  {
    // tools/pvc-check.mjs runs the vendored checker with --strict-framework and enforces the
    // TIER_SKIP it means, without turning advisory warnings (VIEW_NO_FACT, WRAPPER_SUSPECT) red.
    name: "pvc",
    run: () => sh("bun", ["tools/pvc-check.mjs", "src", "--strict-framework"], "pvc"),
  },
  { name: "states", run: () => sh("bun", ["tools/states-check.ts"], "states") },
  { name: "types", run: () => sh("bunx", ["vue-tsc", "--noEmit"], "types") },
  { name: "unit", run: () => sh("bunx", ["vitest", "run"], "unit") },
  {
    name: "generated",
    run: () => {
      const hooks = sh("bun", ["tools/build-hooks.mjs"], "hooks");
      if (hooks !== 0) return hooks;
      return sh("bun", ["tools/build-avatar.ts"], "avatar");
    },
  },
  {
    name: "db",
    run: () => {
      sh("bun", ["tools/pb.mjs", "stop"], "db-stop");
      const reset = sh("bun", ["tools/pb.mjs", "reset"], "db-reset");
      if (reset !== 0) return reset;
      const su = sh("bun", ["tools/pb.mjs", "superuser"], "db-superuser");
      if (su !== 0) return su;
      const serve = sh("bun", ["tools/pb.mjs", "serve"], "db-serve");
      if (serve !== 0) return serve;
      return sh("bun", ["tools/seed.mjs"], "db-seed");
    },
  },
  { name: "api", run: () => sh("bun", ["tools/verify-api.ts"], "api") },
  {
    name: "audit",
    run: () => sh(".venv/Scripts/python.exe", ["tools/db-audit.py"], "audit"),
  },
  {
    name: "build",
    run: () => {
      const status = sh("bunx", ["quasar", "build", "-m", "spa"], "build");
      if (status === 0) observed.bundle = bundleFingerprint();
      return status;
    },
  },
  {
    name: "serve",
    run: async () => {
      const built = bundleFingerprint();
      if (!built) {
        console.error("gate: dist/spa/index.html is missing after the build; nothing to verify");
        return 1;
      }
      observed.bundle = built;
      // The probe no longer accepts "something answered". It names the child that owns the
      // port, then compares the served index.html with the one just built: a survivor from an
      // earlier run may answer on 9100, and accepting it would certify a bundle that no longer
      // matches the source.
      const child = spawn("bun", ["tools/serve.mjs", String(SPA_PORT)], {
        stdio: "ignore",
        cwd: ROOT,
        windowsHide: true,
      });
      harness.server = child;
      harness.pid = child.pid ?? null;
      const state: { exited: number | null } = { exited: null };
      child.once("exit", (code) => {
        state.exited = code ?? 1;
      });
      child.once("error", () => {
        state.exited = 1;
      });
      const url = `http://127.0.0.1:${SPA_PORT}/index.html`;
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            const digest = sha256(Buffer.from(await res.arrayBuffer()));
            const exited = state.exited;
            observed.served = {
              url,
              sha256: digest,
              matches: digest === built.sha256,
              server: exited === null ? "this-run" : "survivor",
            };
            if (digest !== built.sha256) {
              console.error(
                `gate: stale server on :${SPA_PORT} is serving another bundle` +
                  (exited === null ? "" : ` (this run's server exited ${exited})`) +
                  `\n  built  sha256:${built.sha256}  dist/spa/index.html` +
                  `\n  served sha256:${digest}  ${url}`,
              );
              return 1;
            }
            if (exited !== null) {
              // A survivor can still serve the freshly built files (serve.mjs reads per
              // request), which keeps the suite valid; teardown frees the port afterwards.
              console.warn(
                `gate: warning — :${SPA_PORT} was answered by a stale survivor (this run's server exited ${exited}); the bytes match the build, so teardown will just free the port`,
              );
            }
            return 0;
          }
        } catch {
          /* not up yet */
        }
        const exited = state.exited;
        if (exited !== null) {
          console.error(`gate: serve exited (${exited}) before answering on :${SPA_PORT}`);
          return 1;
        }
        await sleep(250);
      }
      console.error(`gate: no answer on :${SPA_PORT} within 10 s`);
      return 1;
    },
  },
  {
    name: "e2e:ar",
    run: () =>
      sh("bunx", ["playwright", "test", "--project=ar"], "e2e-ar", {
        BASE_URL: `http://127.0.0.1:${SPA_PORT}`,
      }),
  },
  {
    name: "e2e:en",
    run: () =>
      sh("bunx", ["playwright", "test", "--project=en"], "e2e-en", {
        BASE_URL: `http://127.0.0.1:${SPA_PORT}`,
      }),
  },
  { name: "docs", run: () => sh("bun", ["tools/linkcheck.ts"], "docs") },
];

// The full profile adds the volume run; the fast profile keeps the inner loop.
if (process.argv.includes("--full")) {
  steps.splice(steps.length - 1, 0, {
    name: "stress",
    run: () => sh("bun", ["tools/stress.ts", "--rows=2000"], "stress"),
  });
}

const records: StepRecord[] = steps.map((step) => ({
  name: step.name,
  status: "pending",
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  exitCode: null,
  logs: [],
}));

// ------------------------------------------------------------------ verdict persistence

const RUN: {
  startedAt: string;
  startedMs: number;
  finishedAt: string | null;
  finishedMs: number | null;
  profile: "fast" | "full";
  verdict: VerdictState;
  failedStep: string | null;
  error: string | null;
  teardown: TeardownReport | null;
} = {
  startedAt: new Date().toISOString(),
  startedMs: Date.now(),
  finishedAt: null,
  finishedMs: null,
  profile: process.argv.includes("--full") ? "full" : "fast",
  // Pessimistic until the last step passes: an in-flight or killed run must never read green.
  verdict: "red",
  failedStep: null,
  error: null,
  teardown: null,
};

type VerdictFile = {
  schemaVersion: 1;
  profile: "fast" | "full";
  argv: string[];
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  verdict: VerdictState;
  failedStep: string | null;
  error: string | null;
  bundle: BundleFingerprint | null;
  served: ServedFingerprint | null;
  steps: StepRecord[];
  teardown: TeardownReport | null;
  runtime: { platform: string; arch: string; node: string; bun: string | null };
  log: string;
};

function persistVerdict(): void {
  const snapshot: VerdictFile = {
    schemaVersion: 1,
    profile: RUN.profile,
    argv: process.argv.slice(2),
    startedAt: RUN.startedAt,
    finishedAt: RUN.finishedAt,
    durationMs: RUN.finishedMs === null ? null : RUN.finishedMs - RUN.startedMs,
    verdict: RUN.verdict,
    failedStep: RUN.failedStep,
    error: RUN.error,
    bundle: observed.bundle,
    served: observed.served,
    steps: records,
    teardown: RUN.teardown,
    runtime: {
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      bun: (process.versions as Record<string, string | undefined>).bun ?? null,
    },
    log: `${LOGS_REL}/gate.log`,
  };
  try {
    // Write-then-rename: a reader (or a crash) never sees half a JSON document.
    const temp = `${VERDICT_FILE}.tmp`;
    writeFileSync(temp, `${JSON.stringify(snapshot, null, 2)}\n`);
    renameSync(temp, VERDICT_FILE);
  } catch (err) {
    console.error(`gate: could not write ${VERDICT_FILE}: ${message(err)}`);
  }
}

function appendVerdictLine(): void {
  const passed = records.filter((r) => r.status === "pass").length;
  const ports = RUN.teardown?.ports ?? [];
  const leaked = ports.filter((p) => !p.ok).map((p) => `:${p.port}`);
  const teardown =
    RUN.teardown === null ? "not-run" : RUN.teardown.ok ? "clean" : `leak(${leaked.join(",")})`;
  const served =
    observed.served === null ? "not-served" : observed.served.matches ? "match" : "mismatch";
  const server = observed.served?.server ?? "-";
  const duration = (RUN.finishedMs ?? Date.now()) - RUN.startedMs;
  const line = [
    new Date().toISOString(),
    `verdict=${RUN.verdict}`,
    `profile=${RUN.profile}`,
    `steps=${passed}/${records.length}`,
    `failed=${RUN.failedStep ?? "-"}`,
    `bundle=${observed.bundle === null ? "-" : `sha256:${observed.bundle.sha256}`}`,
    `served=${served}`,
    `server=${server}`,
    `teardown=${teardown}`,
    `duration=${duration}ms`,
  ].join(" ");
  try {
    appendFileSync(GATE_LOG, `${line}\n`);
  } catch (err) {
    console.error(`gate: could not append to ${GATE_LOG}: ${message(err)}`);
  }
}

// ------------------------------------------------------------------ running

function printTeardown(report: TeardownReport): void {
  for (const port of report.ports) {
    if (port.ok) {
      const killed = port.killed.length > 0 ? ` (killed pid ${port.killed.join(", ")})` : "";
      console.log(`teardown: :${port.port} free${killed}`);
    } else {
      const holders = port.remaining.length > 0 ? port.remaining.join(", ") : "unknown";
      console.error(
        `TEARDOWN: :${port.port} still held by pid ${holders}${port.error ? ` — ${port.error}` : ""}`,
      );
    }
  }
}

function markRemainingSkipped(from: number): void {
  for (const record of records.slice(from)) {
    if (record.status === "pending") record.status = "skipped";
  }
}

async function runSteps(): Promise<number> {
  persistVerdict();
  for (const [index, step] of steps.entries()) {
    const record = records[index];
    if (!record) continue;
    active = record;
    record.status = "running";
    record.startedAt = new Date().toISOString();
    const started = Date.now();
    let status: number;
    try {
      status = await step.run();
    } catch (err) {
      record.status = "crash";
      record.finishedAt = new Date().toISOString();
      record.durationMs = Date.now() - started;
      active = null;
      RUN.verdict = "crashed";
      RUN.failedStep = step.name;
      RUN.error = message(err);
      markRemainingSkipped(index + 1);
      persistVerdict();
      console.error(`CRASH ${step.name}: ${RUN.error}`);
      return 1;
    }
    const ms = Date.now() - started;
    active = null;
    record.status = status === 0 ? "pass" : "fail";
    record.exitCode = status;
    record.finishedAt = new Date().toISOString();
    record.durationMs = ms;
    persistVerdict();
    console.log(`${status === 0 ? "PASS" : "FAIL"}  ${step.name}  (${ms} ms)`);
    if (status !== 0) {
      RUN.verdict = "red";
      RUN.failedStep = step.name;
      markRemainingSkipped(index + 1);
      persistVerdict();
      return 1;
    }
  }
  RUN.verdict = "green";
  persistVerdict();
  return 0;
}

// Every path out — pass, fail, crash, Ctrl+C — writes the verdict before exiting.
let finalized = false;

function bail(verdict: "crashed" | "interrupted", reason: unknown): never {
  if (finalized) process.exit(verdict === "crashed" ? 1 : 130);
  finalized = true;
  RUN.verdict = verdict;
  RUN.error = RUN.error ?? message(reason);
  if (active) {
    RUN.failedStep = RUN.failedStep ?? active.name;
    active.status = verdict === "crashed" ? "crash" : "interrupted";
    active.finishedAt = new Date().toISOString();
    if (active.startedAt !== null) {
      active.durationMs = Date.now() - Date.parse(active.startedAt);
    }
    active = null;
  }
  for (const record of records) {
    if (record.status === "pending") record.status = "skipped";
  }
  RUN.teardown = emergencyTeardown();
  RUN.finishedAt = new Date().toISOString();
  RUN.finishedMs = Date.now();
  persistVerdict();
  appendVerdictLine();
  console.error(`gate: ${verdict} — ${RUN.error} (see ${VERDICT_FILE})`);
  process.exit(verdict === "crashed" ? 1 : 130);
}

process.on("uncaughtException", (err) => bail("crashed", err));
process.on("unhandledRejection", (err) => bail("crashed", err));
process.on("SIGINT", () => bail("interrupted", new Error("interrupted (SIGINT)")));
process.on("SIGTERM", () => bail("interrupted", new Error("interrupted (SIGTERM)")));

let exitCode: number;
try {
  exitCode = await runSteps();
} catch (err) {
  // A throw outside a step (verdict write, step table bug) still leaves a verdict.
  RUN.verdict = "crashed";
  RUN.error = message(err);
  for (const record of records) {
    if (record.status !== "running") continue;
    record.status = "crash";
    record.finishedAt = new Date().toISOString();
    RUN.failedStep = RUN.failedStep ?? record.name;
  }
  exitCode = 1;
}

try {
  RUN.teardown = await teardownAll();
} catch (err) {
  RUN.teardown = {
    ok: false,
    serverPid: harness.pid,
    serverExit: null,
    pbStop: { exitCode: null, log: `${LOGS_REL}/db-stop-teardown.log` },
    ports: [],
  };
  RUN.error = RUN.error ?? `teardown failed: ${message(err)}`;
}
RUN.finishedAt = new Date().toISOString();
RUN.finishedMs = Date.now();
persistVerdict();
appendVerdictLine();
if (RUN.teardown !== null) printTeardown(RUN.teardown);

console.log(
  exitCode === 0
    ? "\ngate: green"
    : `\ngate: ${records.filter((r) => r.status === "fail" || r.status === "crash").length || 1} step(s) failed — see ${LOGS_REL}/`,
);
console.log(`gate: verdict written to ${relative(ROOT, VERDICT_FILE).replace(/\\/g, "/")}`);
finalized = true;
process.exit(exitCode);
