// Home copy matches the product (OI-279) and the ported design keeps the CSP rules in its sources.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const LANGS = ["tr", "en", "de"] as const;
const OBJECTS = { tr: "nesne", en: "objects", de: "Objekte" };

describe("home copy matches the product (OI-279)", () => {
  for (const lang of LANGS) {
    const copy = JSON.parse(read(`site/content/${lang}/home.json`)) as Record<string, string>;
    const all = JSON.stringify(copy) + read(`site/content/${lang}/home-script.json`);

    it(`${lang}: no "42 tables" and no "last 14 days" (the fixtures show 10 objects and 7/30/90-day ranges)`, () => {
      expect(all).not.toMatch(/\b42\s*(tables|tablo|Tabellen)/i);
      expect(all).not.toMatch(/\b14\s*(days|gün|Tage)/i);
      expect(copy["in.tables"]).toBe(OBJECTS[lang]);
      expect(copy["app.n32p"]).toMatch(/7.*30.*90/);
    });

    it(`${lang}: every screenshot has alt text`, () => {
      for (const id of [
        "chat",
        "approvals",
        "data-access",
        "health",
        "sign-in",
        "phone-chat",
        "phone-history",
        "phone-data-access",
        "product-wide",
      ]) {
        expect(copy[`shot.${id}`]?.trim(), `shot.${id}`).toBeTruthy();
      }
    });
  }

  it("the install scene counts the scanned schema to 10 objects", () => {
    expect(read("site/assets/js/home.js")).toMatch(/\$\(["']tblN["']\)\.textContent = Math\.round\(10 \* /);
  });
});

describe("ported design sources keep the CSP rules", () => {
  it("home.js builds no style attribute (style-src 'self' blocks them)", () => {
    expect(read("site/assets/js/home.js")).not.toMatch(/style=/);
  });

  it("the stylesheets use no data: URL (img-src 'self')", () => {
    for (const file of ["fonts.css", "landing.css", "site.css"]) {
      expect(read(`site/assets/css/${file}`), file).not.toMatch(/url\(\s*["']?data:/i);
    }
  });
});
