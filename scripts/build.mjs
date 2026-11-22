// Zero-dependency build: site/ (templates + content + assets + static) -> dist/.
// Fails on any missing content key, so no page ships with an untranslated string.
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const ORIGIN = "https://loquein.com";
export const LANGS = ["tr", "en", "de"];

const SITE = path.join(ROOT, "site");
const DIST = path.join(ROOT, "dist");
const CSS_ORDER = ["fonts.css", "site.css"];
const WORDMARK = 'lo<span class="lq-violet">que</span>in';

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// {{name}} is escaped, {{{name}}} is inserted as is. A missing variable is a build error.
export function render(template, vars, where) {
  return template.replace(/\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*(\w+)\s*\}\}/g, (_, raw, esc) => {
    const key = raw ?? esc;
    if (!(key in vars)) throw new Error(`${where}: template variable "${key}" has no value`);
    return raw ? String(vars[key]) : escapeHtml(vars[key]);
  });
}

function lookup(content, lang, dotted) {
  const value = dotted.split(".").reduce((node, key) => node?.[key], content[lang]);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`content/${lang}: missing key "${dotted}"`);
  }
  return value;
}

async function emitHashed(srcBuf, relDir, baseName, ext) {
  const name = `${baseName}.${hash(srcBuf)}${ext}`;
  await mkdir(path.join(DIST, relDir), { recursive: true });
  await writeFile(path.join(DIST, relDir, name), srcBuf);
  return `/${relDir}/${name}`;
}

async function buildAssets() {
  const fontDir = path.join(SITE, "assets/fonts");
  const fontMap = new Map();
  for (const file of (await readdir(fontDir)).sort()) {
    const buf = await readFile(path.join(fontDir, file));
    if (file.endsWith(".woff2")) {
      fontMap.set(file, await emitHashed(buf, "assets/fonts", file.replace(/\.woff2$/, ""), ".woff2"));
    } else if (file.endsWith(".txt")) {
      await mkdir(path.join(DIST, "assets/fonts"), { recursive: true });
      await writeFile(path.join(DIST, "assets/fonts", file), buf);
    }
  }
  let css = "";
  for (const file of CSS_ORDER) css += `${await readFile(path.join(SITE, "assets/css", file), "utf8")}\n`;
  css = css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, file) => {
    const url = fontMap.get(file);
    if (!url) throw new Error(`css: font "${file}" not found in site/assets/fonts`);
    return `url("${url}")`;
  });
  return { css: await emitHashed(Buffer.from(css), "assets/css", "site", ".css") };
}

function alternatesFor(page) {
  const links = LANGS.filter((l) => page.paths[l]).map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${page.paths[l]}">`,
  );
  const fallback = page.paths.tr ?? page.paths[LANGS.find((l) => page.paths[l])];
  links.push(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}${fallback}">`);
  return links.join("\n");
}

function langSwitchFor(page, lang, home, content) {
  return LANGS.map((l) => {
    const href = page.paths[l] ?? home.paths[l];
    const current = l === lang ? ' aria-current="page"' : "";
    const name = escapeHtml(lookup(content, l, "langName"));
    return `<li><a href="${href}" hreflang="${l}" lang="${l}"${current}>${name}</a></li>`;
  }).join("\n");
}

function legalLinksFor(pages, lang, content) {
  return pages
    .filter((p) => p.footer)
    .map((p) => {
      const linkLang = p.paths[lang] ? lang : LANGS.find((l) => p.paths[l]);
      const label = escapeHtml(lookup(content, linkLang, `pages.${p.id}.title`));
      const langAttr = linkLang === lang ? "" : ` hreflang="${linkLang}" lang="${linkLang}"`;
      return `<li><a href="${p.paths[linkLang]}"${langAttr}>${label}</a></li>`;
    })
    .join("\n");
}

function sitemap(pages) {
  const urls = pages.flatMap((page) =>
    LANGS.filter((l) => page.paths[l]).map((l) => {
      const alts = LANGS.filter((a) => page.paths[a])
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${ORIGIN}${page.paths[a]}"/>`)
        .join("\n");
      return `  <url>\n    <loc>${ORIGIN}${page.paths[l]}</loc>\n${alts}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

export async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const { pages } = await readJson(path.join(SITE, "routes.json"));
  const content = {};
  for (const lang of LANGS) content[lang] = await readJson(path.join(SITE, "content", lang, "site.json"));
  const templates = {};
  for (const name of ["layout", "home", "legal", "404"]) {
    templates[name] = await readFile(path.join(SITE, "templates", `${name}.html`), "utf8");
  }
  const home = pages.find((p) => p.id === "home");
  const { css } = await buildAssets();

  let count = 0;
  for (const page of pages) {
    for (const lang of LANGS.filter((l) => page.paths[l])) {
      const where = `${page.id}/${lang}`;
      const title = lookup(content, lang, `pages.${page.id}.title`);
      const main = render(
        templates[page.template],
        {
          wordmark: WORDMARK,
          title,
          status: page.template === "home" ? lookup(content, lang, `pages.${page.id}.status`) : "",
          draft: lookup(content, lang, "draft"),
        },
        where,
      );
      const html = render(
        templates.layout,
        {
          lang,
          title: page.id === "home" ? title : `${title} · Loquein`,
          description: lookup(content, lang, `pages.${page.id}.description`),
          canonical: `${ORIGIN}${page.paths[lang]}`,
          alternates: alternatesFor(page),
          ogLocale: lookup(content, lang, "ogLocale"),
          css,
          skip: lookup(content, lang, "skip"),
          homeHref: home.paths[lang],
          wordmark: WORDMARK,
          langNav: lookup(content, lang, "langNav"),
          langSwitch: langSwitchFor(page, lang, home, content),
          main,
          legalNav: lookup(content, lang, "legalNav"),
          legalLinks: legalLinksFor(pages, lang, content),
        },
        where,
      );
      const outDir = path.join(DIST, page.paths[lang]);
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, "index.html"), html);
      count++;
    }
  }
  await writeFile(path.join(DIST, "404.html"), render(templates["404"], { css, wordmark: WORDMARK }, "404"));
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap(pages));
  await cp(path.join(SITE, "static"), DIST, { recursive: true });
  return count;
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const count = await build();
  console.log(`build: ${count} pages + 404 -> dist/`);
}
