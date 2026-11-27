#!/usr/bin/env node
// Keeps AkiliBiz Web on exactly the same words as AkiliBiz Desktop.
//
// The desktop repository owns the translation dictionaries (en-UG, lg-UG,
// sw-UG) and the translate/format helpers. This script copies them into
// lib/i18n unchanged, apart from import paths, so every label, button and
// message reads the same on both platforms.
//
//   node scripts/sync-desktop-i18n.mjs          copy from the desktop repository
//   node scripts/sync-desktop-i18n.mjs --check  fail if the web copy has drifted
//
// The desktop repository defaults to ../../../akilibiz (sibling checkout);
// override with AKILIBIZ_DESKTOP_REPO.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(process.env.AKILIBIZ_DESKTOP_REPO ?? resolve(here, "../../../../akilibiz"));
const source = resolve(desktop, "src/i18n");
const target = resolve(here, "../lib/i18n");
const files = ["en-UG.ts", "lg-UG.ts", "sw-UG.ts", "index.ts"];
const header =
  "// GENERATED from the AkiliBiz Desktop repository (src/i18n). Do not edit here:\n" +
  "// change the desktop dictionary, then run `node scripts/sync-desktop-i18n.mjs`.\n";

function transform(text) {
  return header + text.replace(/from "@\/i18n\/([A-Za-z-]+)"/g, 'from "./$1"');
}

if (!existsSync(source)) {
  console.error(`Desktop dictionaries not found at ${source}. Set AKILIBIZ_DESKTOP_REPO.`);
  process.exit(2);
}
const check = process.argv.includes("--check");
let drift = 0;
await mkdir(target, { recursive: true });
for (const file of files) {
  const expected = transform(await readFile(resolve(source, file), "utf8"));
  const path = resolve(target, file);
  const actual = existsSync(path) ? await readFile(path, "utf8") : null;
  if (actual === expected) continue;
  if (check) {
    drift += 1;
    console.error(`DRIFT: lib/i18n/${file} differs from desktop src/i18n/${file}`);
  } else {
    await writeFile(path, expected);
    console.log(`synced lib/i18n/${file}`);
  }
}
if (check && drift) process.exit(1);
if (check) console.log("Web translations match the desktop.");
