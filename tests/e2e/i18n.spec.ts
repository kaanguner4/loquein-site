// lang, canonical, hreflang triples + x-default, language switch, same structure per language (step0 h, i "i18n").
import { expect, expectNoProblems, HOME, LANGS, ORIGIN, ROUTES, test } from "./fixtures";

for (const route of ROUTES) {
  for (const lang of LANGS.filter((l) => route.paths[l])) {
    const path = route.paths[lang] as string;
    test(`i18n: ${route.id} ${lang} ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      const problems: string[] = [];
      const htmlLang = await page.locator("html").getAttribute("lang");
      if (htmlLang !== lang) problems.push(`<html lang="${htmlLang}"> != ${lang}`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      if (canonical !== `${ORIGIN}${path}`) problems.push(`canonical ${canonical} != ${ORIGIN}${path}`);

      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((els) => els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]));
      const expected = LANGS.filter((l) => route.paths[l]).map((l) => [l, `${ORIGIN}${route.paths[l]}`]);
      const xDefault = route.paths.en ?? (route.paths[LANGS.find((l) => route.paths[l]) as "en"] as string);
      expected.push(["x-default", `${ORIGIN}${xDefault}`]);
      const fmt = (pairs: (string | null)[][]) =>
        pairs
          .map((p) => p.join("="))
          .sort()
          .join(", ");
      if (fmt(alternates) !== fmt(expected)) problems.push(`hreflang [${fmt(alternates)}] != [${fmt(expected)}]`);

      const switchLinks = await page.locator(".lang-switch a").evaluateAll((els) =>
        els.map((e) => ({
          hreflang: e.getAttribute("hreflang"),
          href: e.getAttribute("href"),
          current: e.getAttribute("aria-current"),
        })),
      );
      for (const l of LANGS) {
        const link = switchLinks.find((s) => s.hreflang === l);
        const want = route.paths[l] ?? HOME.paths[l];
        if (!link) problems.push(`language switch has no ${l} link`);
        else {
          if (link.href !== want) problems.push(`language switch ${l} -> ${link.href}, expected ${want}`);
          if ((link.current === "page") !== (l === lang)) problems.push(`aria-current wrong on the ${l} link`);
        }
      }
      expectNoProblems(problems);
    });
  }

  test(`i18n: ${route.id} has the same section ids in every language`, async ({ page }) => {
    const idsByLang: Record<string, string> = {};
    for (const lang of LANGS.filter((l) => route.paths[l])) {
      await page.goto(route.paths[lang] as string, { waitUntil: "load" });
      idsByLang[lang] = (await page.locator("main [id], main[id]").evaluateAll((els) => els.map((e) => e.id))).join(
        ",",
      );
    }
    const distinct = new Set(Object.values(idsByLang));
    expect(distinct.size, `section ids differ: ${JSON.stringify(idsByLang)}`).toBe(1);
  });
}

test("i18n: every language switch target resolves", async ({ page }) => {
  const targets = new Set(ROUTES.flatMap((r) => LANGS.map((l) => r.paths[l] ?? HOME.paths[l])));
  const problems: string[] = [];
  for (const target of targets) {
    const res = await page.goto(target as string);
    if (res?.status() !== 200) problems.push(`${target} -> ${res?.status()}`);
  }
  expectNoProblems(problems);
});
