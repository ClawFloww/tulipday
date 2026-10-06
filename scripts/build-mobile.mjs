// Statische export voor Capacitor (iOS/Android).
//
// Admin, partnerportaal en API-routes (plus hun componenten) draaien alleen op de server (Server Actions,
// route handlers) en horen niet in de app. `output: "export"` weigert die, dus we
// zetten ze tijdens de build tijdelijk opzij en zetten ze daarna altijd terug.
//
// Gebruik: node scripts/build-mobile.mjs

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STASH = path.join(ROOT, ".mobile-build-stash");
const SERVER_ONLY = [
  "app/admin",
  "app/partner",
  "app/api",
  "components/admin",
  "components/partner",
];
const stashPath = (rel) => path.join(STASH, rel.replaceAll("/", "__"));

function restore() {
  if (!existsSync(STASH)) return;
  for (const rel of SERVER_ONLY) {
    const stashed = stashPath(rel);
    if (existsSync(stashed)) renameSync(stashed, path.join(ROOT, rel));
  }
  if (readdirSync(STASH).length === 0) rmdirSync(STASH);
}

// Een eerder afgebroken build kan mappen in de stash hebben laten staan.
restore();

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(1);
  });
}

mkdirSync(STASH, { recursive: true });
for (const rel of SERVER_ONLY) {
  const src = path.join(ROOT, rel);
  if (existsSync(src)) renameSync(src, stashPath(rel));
}

let failed = false;
try {
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "mobile" },
  });
} catch {
  failed = true;
} finally {
  restore();
}

process.exit(failed ? 1 : 0);
