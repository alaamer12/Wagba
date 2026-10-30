#!/usr/bin/env bun
// The one command that decides whether the repo is healthy. Every step streams to
// artifacts/logs/<step>.log; the servers are always torn down, even on failure.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const LOGS = "artifacts/logs";
mkdirSync(LOGS, { recursive: true });

// The static server the e2e steps run against. It must be the child of this run: a
// detached survivor from an earlier gate answers on the same port and the suite then
// tests a bundle that no longer matches the source. Held in an object so the teardown
// sees the declared type rather than narrowing the initializer away.
const harness: { server: ReturnType<typeof spawn> | null } = { server: null };

// steps are plain objects: { name, run() }

function sh(cmd: string, args: string[], log: string, env?: Record<string, string>): number {
  const out = [];
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: false,
  });
  out.push(result.stdout ?? "", result.stderr ?? "");
  writeFileSync(`${LOGS}/${log}.log`, out.join("\n"));
  return result.status ?? 1;
}

const steps = [
  { name: "biome", run: () => sh("bunx", ["biome", "check"], "biome") },
  {
    name: "pvc",
    run: () => sh(".venv/Scripts/python.exe", ["tools/check_pvc.py", "src"], "pvc"),
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
  { name: "build", run: () => sh("bunx", ["quasar", "build", "-m", "spa"], "build") },
  {
    name: "serve",
    run: async () => {
      harness.server = spawn("bun", ["tools/serve.mjs", "9100"], { stdio: "ignore" });
      for (let i = 0; i < 40; i++) {
        try {
          const res = await fetch("http://127.0.0.1:9100/");
          if (res.ok) return 0;
        } catch {
          /* not up yet */
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      return 1;
    },
  },
  {
    name: "e2e:ar",
    run: () =>
      sh("bunx", ["playwright", "test", "--project=ar"], "e2e-ar", {
        BASE_URL: "http://127.0.0.1:9100",
      }),
  },
  {
    name: "e2e:en",
    run: () =>
      sh("bunx", ["playwright", "test", "--project=en"], "e2e-en", {
        BASE_URL: "http://127.0.0.1:9100",
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

let failed = 0;
for (const step of steps) {
  const started = Date.now();
  const status = await step.run();
  const ms = Date.now() - started;
  console.log(`${status === 0 ? "PASS" : "FAIL"}  ${step.name}  (${ms} ms)`);
  if (status !== 0) {
    failed++;
    break; // a red step makes later steps meaningless; the logs say why
  }
}

// Every path out of the loop tears the servers down, including a red step.
harness.server?.kill();
harness.server = null;
spawnSync("bun", ["tools/pb.mjs", "stop"], { stdio: "ignore" });
spawnSync("cmd", ["/c", "netstat -ano"], { stdio: "ignore" });

console.log(failed === 0 ? "\ngate: green" : `\ngate: ${failed} step(s) failed — see ${LOGS}/`);
process.exit(failed === 0 ? 0 : 1);
