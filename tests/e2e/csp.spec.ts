// Zero CSP violations on every page (step0 i "CSP listener"), plus a control that proves the listener works.
import type { Page } from "@playwright/test";
import { expect, expectNoProblems, NOT_FOUND_PATH, PAGES, scrollThrough, test } from "./fixtures";

declare global {
  interface Window {
    __csp: string[];
  }
}

async function listen(page: Page): Promise<string[]> {
  const consoleHits: string[] = [];
  page.on("console", (m) => {
    if (/content[ -]security[ -]policy|\bCSP\b/i.test(m.text()))
      consoleHits.push(`console: ${m.text().split("\n")[0]}`);
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__csp.push(
        `${e.effectiveDirective} blocked ${e.blockedURI || "(inline)"} at ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
  return consoleHits;
}

for (const path of [...PAGES, NOT_FOUND_PATH]) {
  test(`csp: ${path}`, async ({ page }) => {
    const consoleHits = await listen(page);
    await page.goto(path, { waitUntil: "load" });
    await scrollThrough(page);
    await page.waitForTimeout(300);
    const violations = await page.evaluate(() => window.__csp);
    expectNoProblems([...violations, ...consoleHits]);
  });
}

test("csp: listener catches an injected inline style (control)", async ({ page }) => {
  await listen(page);
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = "body { outline: 1px solid red; }";
    document.head.append(style);
  });
  await expect
    .poll(() => page.evaluate(() => window.__csp.length), { message: "the CSP listener saw no violation" })
    .toBeGreaterThan(0);
});

test("csp: home through the intro, every screen tab and every product card", async ({ page }) => {
  const consoleHits = await listen(page);
  await page.goto("/", { referer: "https://example.org/", waitUntil: "load" });
  await expect(page.locator("#intro"), "intro did not end").toHaveCount(0, { timeout: 8000 });
  const tabs = page.locator("#app [role=tab]");
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(150);
  }
  const cards = page.locator(".bento .more");
  for (let i = 0; i < (await cards.count()); i++) {
    await cards.nth(i).click();
    await page.waitForTimeout(100);
  }
  await page.locator("#replay").click();
  await page.keyboard.press("Escape");
  await scrollThrough(page);
  await page.waitForTimeout(300);
  const violations = await page.evaluate(() => window.__csp);
  expectNoProblems([...violations, ...consoleHits]);
});
