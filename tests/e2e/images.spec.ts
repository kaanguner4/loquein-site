// The real app screenshots (step0 d.11a, h, i "Images"): <picture> with AVIF + WebP, width/height, alt text per
// language, lazy below the fold, self-hosted, within the size budget, and every one of them actually loads.
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, expectNoProblems, HOME_PATHS, test } from "./fixtures";

const SHOT_COUNT = 9;
const IMG_DIR = path.resolve(import.meta.dirname, "../../dist/assets/img/app");
const KB = 1024;

interface Img {
  src: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  loading: string | null;
  types: string[];
}

const imagesOf = (page: import("@playwright/test").Page) =>
  page.locator("main img").evaluateAll((els) =>
    els.map((e) => ({
      src: e.getAttribute("src") ?? "",
      alt: e.getAttribute("alt"),
      width: e.getAttribute("width"),
      height: e.getAttribute("height"),
      loading: e.getAttribute("loading"),
      types: [...(e.closest("picture")?.querySelectorAll("source") ?? [])].map((s) => s.getAttribute("type") ?? ""),
    })),
  );

for (const p of HOME_PATHS) {
  test(`images: ${p} has the ${SHOT_COUNT} screenshots, each a complete <picture>`, async ({ page }) => {
    await page.goto(p, { waitUntil: "load" });
    const imgs: Img[] = await imagesOf(page);
    const problems: string[] = [];
    if (imgs.length !== SHOT_COUNT) problems.push(`${imgs.length} images, expected ${SHOT_COUNT}`);
    for (const img of imgs) {
      const name = img.src.split("/").pop();
      if (!img.src.startsWith("/assets/img/app/")) problems.push(`${img.src}: not a self-hosted screenshot`);
      if (!img.width || !img.height) problems.push(`${name}: no width/height`);
      if (!img.alt?.trim()) problems.push(`${name}: no alt text`);
      if (img.loading !== "lazy") problems.push(`${name}: not lazy (all screenshots are below the fold)`);
      for (const t of ["image/avif", "image/webp"])
        if (!img.types.includes(t)) problems.push(`${name}: no ${t} source`);
    }
    expectNoProblems(problems);
  });
}

test("images: alt text differs per language for every screenshot", async ({ page }) => {
  const alts: (string | null)[][] = [];
  for (const p of HOME_PATHS) {
    await page.goto(p, { waitUntil: "load" });
    alts.push((await imagesOf(page)).map((i) => i.alt));
  }
  const problems: string[] = [];
  for (let i = 0; i < SHOT_COUNT; i++) {
    const set = new Set(alts.map((a) => a[i]));
    if (set.size !== HOME_PATHS.length) problems.push(`screenshot ${i + 1}: alt text repeats across languages`);
  }
  expectNoProblems(problems);
});

test("images: every screenshot loads, through every screen tab", async ({ page, browserName }) => {
  await page.goto("/en/", { waitUntil: "load" });
  const tabs = page.locator("#app [role=tab]");
  const problems: string[] = [];
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    const panel = page.locator(`#axv${i}`);
    await expect(panel).toBeVisible();
    for (const img of await panel.locator("img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
      const current = await img.evaluate((e: HTMLImageElement) => e.currentSrc);
      if (browserName !== "webkit" && !current.endsWith(".avif"))
        problems.push(`tab ${i + 1}: loaded ${current}, not AVIF`);
    }
  }
  const wide = page.locator("#urun img");
  await wide.scrollIntoViewIfNeeded();
  await expect.poll(() => wide.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
  expectNoProblems(problems);
});

test("images: file size budget (1x <= 120 KB, 2x <= 200 KB)", () => {
  const files = readdirSync(IMG_DIR);
  const widths = new Map<string, number[]>();
  for (const f of files) {
    const m = f.match(/^(.+)-(\d+)\.[0-9a-f]{10}\.(avif|webp)$/);
    if (!m) continue;
    widths.set(m[1], [...(widths.get(m[1]) ?? []), Number(m[2])]);
  }
  const problems: string[] = [];
  for (const f of files) {
    const m = f.match(/^(.+)-(\d+)\.[0-9a-f]{10}\.(avif|webp)$/);
    if (!m) continue;
    const oneX = Math.min(...(widths.get(m[1]) ?? [])) === Number(m[2]);
    const size = statSync(path.join(IMG_DIR, f)).size;
    const limit = (oneX ? 120 : 200) * KB;
    if (size > limit) problems.push(`${f}: ${Math.round(size / KB)} KB > ${limit / KB} KB`);
  }
  expect(files.length).toBeGreaterThan(0);
  expectNoProblems(problems);
});
