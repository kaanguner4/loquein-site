// The stylesheet and the self-hosted fonts load and render, including the Latin Extended subset for Turkish.
import { expectNoProblems, HOME_PATHS, test } from "./fixtures";

for (const path of HOME_PATHS) {
  test(`assets: ${path} loads its stylesheet and fonts from the site itself`, async ({ page }) => {
    const loaded: string[] = [];
    page.on("response", (r) => {
      if (r.ok()) loaded.push(new URL(r.url()).pathname);
    });
    await page.goto(path, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const problems: string[] = [];
    if (!loaded.some((p) => /^\/assets\/css\/site\.[0-9a-f]{10}\.css$/.test(p)))
      problems.push("hashed stylesheet not loaded");
    const families = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', "")),
    );
    for (const family of ["Inter", "Space Grotesk", "JetBrains Mono"]) {
      if (!families.includes(family))
        problems.push(`font ${family} not loaded (loaded: ${families.join(", ") || "none"})`);
    }
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (bg !== "rgb(247, 245, 240)") problems.push(`body background ${bg}, expected Paper #F7F5F0`);
    expectNoProblems(problems);
  });
}

test("assets: Turkish and German letters use the Latin Extended font files", async ({ page }) => {
  const fonts: string[] = [];
  page.on("response", (r) => {
    if (r.url().endsWith(".woff2")) fonts.push(new URL(r.url()).pathname);
  });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.load('16px "Inter"', "ğşİı äöüß");
    await document.fonts.load('600 16px "Space Grotesk"', "ğşİı äöüß");
  });
  const problems: string[] = [];
  for (const name of ["inter-latin-ext", "space-grotesk-latin-ext"]) {
    if (!fonts.some((f) => f.includes(`/${name}-wght-normal.`))) problems.push(`${name} not fetched`);
  }
  expectNoProblems(problems);
});
