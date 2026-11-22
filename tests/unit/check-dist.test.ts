// check-dist and check-links rules, proven on small generated fixtures (content for most rules lands in LP-1c).
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkDist } from "../../scripts/check-dist.mjs";
import { checkLinks } from "../../scripts/check-links.mjs";

const NOW = Date.parse("2026-11-22T00:00:00Z");
const O = "https://loquein.com";

const page = (lang: string, self: string, body: string, alternates?: string) => `<!DOCTYPE html>
<html lang="${lang}">
<head><title>T</title><meta name="description" content="d">
<link rel="canonical" href="${O}${self}">
${alternates ?? `<link rel="alternate" hreflang="${lang}" href="${O}${self}">\n<link rel="alternate" hreflang="x-default" href="${O}${self}">`}
<link rel="stylesheet" href="/a.css"></head>
<body><main id="main">${body}</main></body></html>`;

function makeDist(files: Record<string, string>, { expires = "2027-11-21T23:59:59Z" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "dist-"));
  const base: Record<string, string> = {
    _headers: "/*\n",
    "robots.txt": "User-agent: *\n",
    "sitemap.xml": "<urlset/>",
    "404.html": '<!DOCTYPE html><html lang="tr"><head><title>404</title></head><body></body></html>',
    "a.css": "",
    ".well-known/security.txt": `Contact: mailto:x@example.org\nExpires: ${expires}\nPreferred-Languages: tr, en, de\nCanonical: ${O}/.well-known/security.txt\n`,
    "index.html": page("tr", "/", "<h1>ok</h1>"),
    ...files,
  };
  for (const [rel, content] of Object.entries(base)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

const problems = (files: Record<string, string>, opts: { production?: boolean; expires?: string } = {}) =>
  checkDist(makeDist(files, opts), { production: opts.production, now: NOW });

describe("check-dist", () => {
  it("passes a clean fixture", () => {
    expect(problems({})).toEqual([]);
  });

  const bad: [string, string, RegExp][] = [
    ["inline style element", "<style>p{}</style>", /inline <style>/],
    ["inline script", "<script>alert(1)</script>", /inline <script>/],
    ["external script", '<script src="https://cdn.example.org/x.js"></script>', /external resource/],
    ["style attribute", '<p style="color:red">x</p>', /style attribute/],
    ["event handler", '<button type="button" onclick="x()">x</button>', /event handler attribute onclick/],
    ["javascript: URL", '<a href="javascript:void(0)">x</a>', /javascript: URL/],
    ["placeholder", "<p>[YOUR PRICE]</p>", /placeholder text \[YOUR PRICE\]/],
    ["test page text", "<p>This is a test page</p>", /"test page"/],
    [
      "external link",
      '<a href="https://example.org/">x</a>',
      /external link https:\/\/example\.org\/ not in the allowlist/,
    ],
    ["external image", '<img src="https://img.example.org/a.png" width="1" height="1" alt="a">', /external resource/],
    ["img without size", '<img src="/a.png" alt="a">', /without width\/height/],
    ["img without alt", '<img src="/a.png" width="1" height="1">', /without alt text/],
    [
      "lazy LCP image",
      '<img src="/a.png" width="1" height="1" alt="a" loading="lazy" fetchpriority="high">',
      /LCP image is lazy/,
    ],
    [
      "picture without avif",
      '<picture><source type="image/webp" srcset="/a.webp"><img src="/a.webp" width="1" height="1" alt="a"></picture>',
      /without a image\/avif source/,
    ],
  ];
  for (const [name, body, rule] of bad) {
    it(`fails on ${name}`, () => {
      const found = problems({ "index.html": page("tr", "/", body) });
      expect(
        found.some((p) => rule.test(p)),
        found.join("\n") || "no problem reported",
      ).toBe(true);
    });
  }

  it("fails on a missing x-default and a missing back-link", () => {
    const tr = `<link rel="alternate" hreflang="tr" href="${O}/">\n<link rel="alternate" hreflang="en" href="${O}/en/">`;
    const found = problems({
      "index.html": page("tr", "/", "<h1>x</h1>", tr),
      "en/index.html": page("en", "/en/", "<h1>x</h1>"),
    });
    expect(found).toContain('index.html: no hreflang="x-default"');
    expect(found).toContain(`index.html: hreflang="en" page ${O}/en/ does not link back with hreflang="tr"`);
  });

  it("fails on a wrong lang, missing title, description and canonical", () => {
    const found = problems({ "index.html": '<!DOCTYPE html><html lang="fr"><head></head><body></body></html>' });
    for (const rule of [/lang> is "fr"/, /missing <title>/, /missing meta description/, /canonical is ""/]) {
      expect(
        found.some((p) => rule.test(p)),
        found.join("\n"),
      ).toBe(true);
    }
  });

  it("fails when German copy promises German questions", () => {
    const found = problems({ "de/index.html": page("de", "/de/", "<p>Stellen Sie Fragen auf Deutsch.</p>") });
    expect(found).toContain("de/index.html: German copy promises German questions");
  });

  it("fails a production build that still has the placeholder marker", () => {
    const html = page("tr", "/", "<h1>x</h1>").replace('<html lang="tr">', '<html lang="tr" data-placeholder="lp-1a">');
    expect(problems({ "index.html": html })).toEqual([]);
    expect(problems({ "index.html": html }, { production: true })).toContain(
      "index.html: placeholder marker in a production build",
    );
  });

  it("fails when security.txt expires in less than 60 days or more than a year", () => {
    expect(problems({}, { expires: "2027-01-10T00:00:00Z" })[0]).toMatch(/less than 60 days away/);
    expect(problems({}, { expires: "2028-01-10T00:00:00Z" })[0]).toMatch(/more than a year away/);
  });
});

describe("check-links", () => {
  it("passes a clean fixture", () => {
    const dir = makeDist({
      "index.html": page("tr", "/", '<a href="/#main">x</a><a href="mailto:guner.kaan@outlook.com">m</a>'),
    });
    expect(checkLinks(dir).problems).toEqual([]);
  });

  it("reports a missing page, a missing anchor, a missing slash and an unlisted mailto", () => {
    const dir = makeDist({
      "index.html": page(
        "tr",
        "/",
        '<a href="/nope/">a</a><a href="/#gone">b</a><a href="/en">c</a><a href="mailto:a@b.c">d</a>',
      ),
      "en/index.html": page("en", "/en/", "<h1>x</h1>"),
    });
    expect(checkLinks(dir).problems).toEqual([
      "index.html: /nope/ -> no such file",
      'index.html: /#gone -> no element with id "gone"',
      "index.html: /en -> no such file (add the trailing slash)",
      "index.html: mailto:a@b.c -> mailto not in the allowlist",
    ]);
  });

  it("checks url() references in CSS", () => {
    const dir = makeDist({ "a.css": '@font-face{src:url("/fonts/missing.woff2")}' });
    expect(checkLinks(dir).problems).toEqual(["a.css: /fonts/missing.woff2 -> no such file"]);
  });
});
