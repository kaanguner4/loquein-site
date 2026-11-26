// The home intro (step0 d.7-8, h, i "Intro"; k10): plays only when the visitor arrives from outside the site,
// can be skipped by button or Escape, keeps the page behind it inert, and never plays on other pages.
import { expect, HOME_PATHS, PAGES, test } from "./fixtures";

const OUTSIDE = "https://example.org/";
const SKIP_LABEL: Record<string, string> = { "/": "Girişi geç", "/en/": "Skip intro", "/de/": "Intro überspringen" };

for (const path of HOME_PATHS) {
  test(`intro: ${path} from another site plays; the skip button is focused and ends it`, async ({ page }) => {
    await page.goto(path, { referer: OUTSIDE, waitUntil: "load" });
    const intro = page.locator("#intro");
    await expect(intro, "intro overlay not shown").toBeVisible();
    await expect(intro).toHaveAttribute("role", "region");
    const skip = intro.getByRole("button", { name: SKIP_LABEL[path] });
    await expect(skip, "skip button is not focused").toBeFocused();
    await expect(page.locator("main"), "page behind the intro is not inert").toHaveJSProperty("inert", true);
    await skip.click();
    await expect(intro, "intro still there after skip").toHaveCount(0);
    await expect(page.locator("main")).toHaveJSProperty("inert", false);
    await expect(page.locator("#hero")).toHaveClass(/\bready\b/);
  });

  test(`intro: ${path} from a page of the site does not play`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator("#hero")).toHaveClass(/\bready\b/);
    await expect(page.locator("#intro")).toHaveCount(0);
  });
}

test("intro: Escape ends it", async ({ page }) => {
  await page.goto("/", { referer: OUTSIDE, waitUntil: "load" });
  await expect(page.locator("#intro")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#intro")).toHaveCount(0);
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
});

test("intro: a typed address (no referrer) plays it, and it ends by itself", async ({ page }) => {
  await page.goto("/en/", { referer: undefined, waitUntil: "load" });
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#intro"), "intro did not end by itself").toHaveCount(0, { timeout: 8000 });
  await expect(page.locator("#hero")).toHaveClass(/\bready\b/);
});

test("intro: reduced motion skips it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { referer: OUTSIDE, waitUntil: "load" });
  await expect(page.locator("#hero")).toHaveClass(/\bready\b/);
  await expect(page.locator("#intro")).toHaveCount(0);
});

for (const path of PAGES.filter((p) => !HOME_PATHS.includes(p))) {
  test(`intro: never on ${path}`, async ({ page }) => {
    await page.goto(path, { referer: OUTSIDE, waitUntil: "load" });
    await page.waitForTimeout(300);
    await expect(page.locator("#intro")).toHaveCount(0);
    await expect(page.locator("script")).toHaveCount(0);
  });
}
