#!/usr/bin/env bun
// The one command that decides whether the repo is healthy. Every step streams to
// artifacts/logs/<step>.log; the servers are always torn down, even on failure.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const LOGS = "artifacts/logs";
mkdirSync(LOGS, { recursive: true });

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
  { name: "types", run: () => sh("bunx", ["vue-tsc", "--noEmit"], "types") },
  { name: "unit", run: () => sh("bunx", ["vitest", "run"], "unit") },
  { name: "hooks", run: () => sh("bun", ["tools/build-hooks.mjs"], "hooks") },
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
  { name: "build", run: () => sh("bunx", ["quasar", "build", "-m", "spa"], "build") },
  {
    name: "serve",
    run: async () => {
      const child = spawn("bun", ["tools/serve.mjs", "9100"], { detached: true, stdio: "ignore" });
      child.unref();
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
    name: "e2e",
    run: () =>
      sh("bunx", ["playwright", "test", "--project=ar"], "e2e", {
        BASE_URL: "http://127.0.0.1:9100",
      }),
  },
  { name: "docs", run: () => sh("bun", ["tools/linkcheck.ts"], "docs") },
];

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

spawnSync("bun", ["tools/pb.mjs", "stop"], { stdio: "ignore" });
spawnSync("cmd", ["/c", "netstat -ano"], { stdio: "ignore" });

console.log(failed === 0 ? "\ngate: green" : `\ngate: ${failed} step(s) failed — see ${LOGS}/`);
process.exit(failed === 0 ? 0 : 1);
