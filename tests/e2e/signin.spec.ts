// The header sign-in link: on every page and language, same tab, one label per language, and the target of the
// build's APP_URL setting (production app by default; the preview deploy builds and runs this spec with the local app).
import { EXPECTED_APP_URL, expect, expectNoProblems, PAGES, test } from "./fixtures";

const LABEL: Record<string, string> = { en: "Sign in", tr: "Giriş yap", de: "Anmelden" };

for (const path of PAGES) {
  test(`sign-in: ${path} has one same-tab link to the app`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const lang = (await page.locator("html").getAttribute("lang")) as string;
    const link = page.locator("header a.signin");
    await expect(link, "expected exactly one sign-in link in the header").toHaveCount(1);
    const problems: string[] = [];
    const href = await link.getAttribute("href");
    if (href !== EXPECTED_APP_URL) problems.push(`href ${href} != ${EXPECTED_APP_URL}`);
    if ((await link.getAttribute("target")) !== null) problems.push("opens in a new tab (target attribute)");
    const name = ((await link.textContent()) ?? "").trim();
    if (name !== LABEL[lang]) problems.push(`label "${name}" != "${LABEL[lang]}" for lang ${lang}`);
    expectNoProblems(problems);
  });
}

test("sign-in: the link is visible at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("header a.signin")).toBeVisible();
});
