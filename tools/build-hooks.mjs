// Bundles the shared fold for PocketBase's goja VM. The hook cannot import TS,
// and goja has no Node built-ins, so this emits a self-contained CJS file.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('pocketbase/pb_hooks/lib', { recursive: true });

await build({
  entryPoints: ['shared/normalize.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2017',
  outfile: 'pocketbase/pb_hooks/lib/normalize.cjs',
  legalComments: 'none',
  logLevel: 'warning',
});

console.log('pocketbase/pb_hooks/lib/normalize.cjs written');
