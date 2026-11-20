// Vice Cover Studio — the entry program (Node 22, standard library only).
//
// It hands the app in: copies app/ (the offline cover maker) and
// screenshots/ (four real renders of it) from beside this file into /output,
// then writes /output/dossier.json with the kit's vendored library — the
// summary the AI judge reads: the contact sheet of the screenshots first,
// then the outline of the source. The run is deterministic: the same
// repository bytes always produce the same /output bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app first with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean slate so a stale file can never leak into the dossier.
// Clear only the directory's CONTENTS, never the directory itself: in the
// grader /output is a volume mount on a read-only root filesystem and the
// program runs as uid 65534, so removing the mount point itself throws
// EACCES (force: true suppresses only ENOENT) and the run exits 1.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier's source text; the rest refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB; app/ over 993 files, 48 MiB,
// or a path over 1,000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
