// App screenshots -> optimized AVIF + WebP at 1x and 2x (step0 d.11a, h). A dev tool, not part of the build:
// its output in site/assets/img/app/ is committed, so CI never needs the PNG sources.
// Usage: node scripts/images.mjs <dir with the ui-close/landing PNGs>
// sharp comes from wrangler's own dependency tree (miniflare), pinned by package-lock.json.
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SHOTS } from "./lib/shots.mjs";

const LANGS = ["tr", "en", "de"];
const OUT = path.resolve(import.meta.dirname, "../site/assets/img/app");

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/images.mjs <source dir>");
  process.exit(2);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const names = new Set(await readdir(src));
let total = 0;
for (const shot of SHOTS) {
  for (const lang of LANGS) {
    const file = `${shot.id}-${lang}.png`;
    if (!names.has(file)) throw new Error(`${file} missing in ${src}`);
    const input = path.join(src, file);
    const meta = await sharp(input).metadata();
    if (meta.width / meta.height - shot.width / shot.height > 0.01) {
      throw new Error(`${file}: ${meta.width}x${meta.height} does not match the ${shot.width}x${shot.height} ratio`);
    }
    for (const w of shot.widths) {
      const base = sharp(input).resize({ width: w, kernel: "lanczos3" });
      const stem = path.join(OUT, `${shot.id}-${lang}-${w}`);
      await base.clone().avif({ quality: 52, effort: 7, chromaSubsampling: "4:4:4" }).toFile(`${stem}.avif`);
      await base.clone().webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(`${stem}.webp`);
      for (const ext of [".avif", ".webp"]) total += (await stat(`${stem}${ext}`)).size;
    }
  }
}
console.log(`images: ${SHOTS.length} screens x ${LANGS.length} languages -> ${OUT} (${Math.round(total / 1024)} KB)`);
