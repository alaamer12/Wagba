#!/usr/bin/env bun
// Manages the local PocketBase process. Windows-first: the binary is untracked and
// downloaded on demand, so a fresh clone does not carry 32 MB it may never run.
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const HOST = '127.0.0.1';
const PORT = 8090;
const BIN = 'pocketbase/pocketbase.exe';
const DIR = 'pocketbase/pb_data';
const MIGRATIONS = 'pocketbase/pb_migrations';
const HOOKS = 'pocketbase/pb_hooks';
const PID_FILE = 'scratch/pb.pid';
const BASE = `http://${HOST}:${PORT}`;

function ensureBin() {
  if (existsSync(BIN)) return;
  console.error(
    `PocketBase binary missing at ${BIN}.\n` +
      'Download the pinned 0.28.4 release and place pocketbase.exe there:\n' +
      '  https://github.com/pocketbase/pocketbase/releases/tag/v0.28.4',
  );
  process.exit(1);
}

async function healthy(timeoutMs = 1000) {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitHealthy(totalMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < totalMs) {
    if (await healthy()) return true;
    await Bun.sleep(250);
  }
  return false;
}

function readPid() {
  try {
    return Number.parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10) || null;
  } catch {
    return null;
  }
}

function stop() {
  const pid = readPid();
  if (!pid) {
    console.log('no pid file; nothing to stop');
    return;
  }
  try {
    process.kill(pid);
    console.log(`stopped pid ${pid}`);
  } catch {
    console.log(`pid ${pid} was not running`);
  }
  try {
    rmSync(PID_FILE);
  } catch {}
}

async function serve() {
  ensureBin();
  if (await healthy()) {
    console.log('already serving on', BASE);
    return;
  }
  mkdirSync('scratch', { recursive: true });
  const log = openSync('scratch/pb.log', 'a');
  const child = spawn(BIN, ['serve', '--dev', `--http=${HOST}:${PORT}`, `--dir=${DIR}`, `--migrationsDir=${MIGRATIONS}`, `--hooksDir=${HOOKS}`], {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  closeSync(log);
  child.unref();
  writeFileSync(PID_FILE, String(child.pid));
  if (!(await waitHealthy())) {
    console.error('PocketBase did not become healthy; check pocketbase/pb_data and the hooks bundle');
    process.exit(1);
  }
  console.log(`serving on ${BASE} (pid ${child.pid})`);
}

function superuser() {
  ensureBin();
  const email = process.env.PB_ADMIN_EMAIL ?? 'admin@wagba.local';
  const pass = process.env.PB_ADMIN_PASSWORD ?? 'wagba-dev-pass';
  const r = spawnSync(BIN, ['superuser', 'upsert', email, pass, `--dir=${DIR}`], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    process.exit(1);
  }
  console.log(`superuser ${email} ready`);
}

async function main() {
  const cmd = process.argv[2] ?? 'serve';
  switch (cmd) {
    case 'reset':
      stop();
      if (process.env.KEEP_DB !== '1') {
        // Windows keeps the directory locked for a moment after the process dies.
        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            rmSync(DIR, { recursive: true, force: true });
            break;
          } catch {
            spawnSync('cmd', ['/c', 'ping', '-n', '1', '-w', '300', '127.0.0.1'], { stdio: 'ignore' });
          }
        }
        if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
      }
      mkdirSync(DIR, { recursive: true });
      console.log('pb_data reset');
      break;
    case 'serve':
      await serve();
      break;
    case 'restart':
      stop();
      await Bun.sleep(500);
      await serve();
      break;
    case 'stop':
      stop();
      break;
    case 'superuser':
      superuser();
      break;
    case 'health':
      console.log((await healthy()) ? 'healthy' : 'down');
      process.exit((await healthy()) ? 0 : 1);
      break;
    default:
      console.error('usage: bun tools/pb.mjs <reset|serve|restart|stop|superuser|health>');
      process.exit(2);
  }
}

await main();
