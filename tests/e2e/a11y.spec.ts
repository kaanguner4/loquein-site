// axe WCAG 2.2 AA: 0 violations on every page, normal and reduced motion; keyboard basics (step0 i "a11y").
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, expectNoProblems, HOME_PATHS, NOT_FOUND_PATH, PAGES, test } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axeProblems(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}: ${v.help}`,
  );
}

for (const path of [...PAGES, NOT_FOUND_PATH]) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    expectNoProblems(await axeProblems(page));
  });
}

for (const path of HOME_PATHS) {
  test(`a11y: ${path} with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path, { waitUntil: "load" });
    expectNoProblems(await axeProblems(page));
  });
}

test("a11y: first Tab reaches the skip link, which moves focus to main", async ({ page, browserName }) => {
  await page.goto("/", { waitUntil: "load" });
  // WebKit only tabs to links with Alt+Tab (macOS "Tab to all controls" off).
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(tab);
  await expect(page.locator(".skip-link"), "first Tab does not focus the skip link").toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page, "skip link does not target #main").toHaveURL(/#main$/);
});
