// Every page is readable with JavaScript disabled: heading and main visible, nothing covers them (step0 d.7).
import { expectNoProblems, NOT_FOUND_PATH, PAGES, test } from "./fixtures";

test.use({ javaScriptEnabled: false });

for (const path of [...PAGES, NOT_FOUND_PATH]) {
  test(`no-js: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const problems: string[] = [];
    const h1 = page.locator("h1").first();
    if (!(await h1.isVisible())) problems.push("h1 is not visible");
    if (!(await page.locator("main").isVisible())) problems.push("main is not visible");
    const box = await h1.boundingBox();
    if (box) {
      // Hit-test the centre of the heading; an overlay (e.g. an intro left by failed JS) would win.
      const covered = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return el && !el.closest("h1") ? el.outerHTML.slice(0, 80) : null;
        },
        [box.x + box.width / 2, box.y + box.height / 2],
      );
      if (covered) problems.push(`h1 is covered by ${covered}`);
    }
    expectNoProblems(problems);
  });
}
