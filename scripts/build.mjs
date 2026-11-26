// Zero-dependency build: site/ (templates + content + assets + static) -> dist/.
// Fails on any missing content key, so no page ships with an untranslated string.
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { APP_URLS, LANGS, ORIGIN } from "./lib/dist.mjs";
import { SHOTS } from "./lib/shots.mjs";

export const ROOT = path.resolve(import.meta.dirname, "..");
export { LANGS, ORIGIN };

// The one build setting: where the header "Sign in" link points. Production default; the preview deploy sets
// APP_URL=http://localhost:5173. Any other value fails the build (check-dist refuses it as well).
export function appUrl(env = process.env) {
  const value = env.APP_URL || APP_URLS.production;
  if (!Object.values(APP_URLS).includes(value)) {
    throw new Error(`APP_URL must be ${Object.values(APP_URLS).join(" or ")}, got "${value}"`);
  }
  return value;
}

const SITE = path.join(ROOT, "site");
const DIST = path.join(ROOT, "dist");
const CSS_ORDER = ["fonts.css", "landing.css", "site.css"];
// Fonts the first view needs on every page (display headline + body text, Latin subset).
const PRELOAD_FONTS = ["bricolage-grotesque-latin-700-normal.woff2", "schibsted-grotesk-latin-400-normal.woff2"];

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

const stripTags = (value) => String(value).replace(/<[^>]*>/g, "");

// {{name}} is escaped, {{{name}}} is inserted as is. A missing variable is a build error.
export function render(template, vars, where) {
  return template.replace(/\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*(\w+)\s*\}\}/g, (_, raw, esc) => {
    const key = raw ?? esc;
    if (!(key in vars)) throw new Error(`${where}: template variable "${key}" has no value`);
    return raw ? String(vars[key]) : escapeHtml(vars[key]);
  });
}

// Percent as each language writes it: %14 (tr), 14% (en), 14 % (de).
export function percent(n, lang) {
  if (lang === "tr") return `%${n}`;
  if (lang === "de") return `${n} %`;
  return `${n}%`;
}

// Home page placeholders (the copy is our own reviewed HTML, see content/<lang>/home.json):
// {{group.key}} copy as HTML · {{attr:group.key}} copy as attribute text · {{shot:id}} <picture> · {{pct:N}} percent.
export function renderHome(template, { copy, lang, picture }, where) {
  const text = (key) => {
    const value = copy[key];
    if (typeof value !== "string" || value.trim() === "") throw new Error(`${where}: missing copy key "${key}"`);
    return value;
  };
  return template.replace(/\{\{(?:(attr|shot|pct):)?([a-z0-9][\w-]*(?:\.[\w.-]+)?)\}\}/g, (match, kind, key) => {
    if (kind === "attr") return escapeHtml(stripTags(text(key)));
    if (kind === "shot") return picture(key);
    if (kind === "pct") return percent(key, lang);
    if (!key.includes(".")) throw new Error(`${where}: unknown placeholder ${match}`);
    return text(key);
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
  // Small UI images (masks, ticks) as files: img-src 'self' allows no data: URLs.
  const uiMap = new Map();
  for (const file of (await readdir(path.join(SITE, "assets/img/ui"))).sort()) {
    if (!file.endsWith(".svg")) continue;
    const buf = await readFile(path.join(SITE, "assets/img/ui", file));
    uiMap.set(file, await emitHashed(buf, "assets/img/ui", file.replace(/\.svg$/, ""), ".svg"));
  }
  css = css.replace(/url\("\.\.\/img\/ui\/([^"]+)"\)/g, (_, file) => {
    const url = uiMap.get(file);
    if (!url) throw new Error(`css: image "${file}" not found in site/assets/img/ui`);
    return `url("${url}")`;
  });
  if (/url\(\s*["']?data:/i.test(css)) throw new Error("css: data: URL (blocked by img-src 'self'); use a file");
  // Drop indentation and whole-line comments (CSS budget, step0 h); declarations stay one per line.
  css = css
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\/\*.*\*\/$/.test(line))
    .join("\n");
  const preloads = PRELOAD_FONTS.map((file) => {
    const url = fontMap.get(file);
    if (!url) throw new Error(`preload: font "${file}" not found`);
    return `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin>`;
  }).join("\n");

  const images = new Map();
  const imgDir = path.join(SITE, "assets/img/app");
  for (const file of (await readdir(imgDir)).sort()) {
    const ext = path.extname(file);
    if (![".avif", ".webp"].includes(ext)) continue;
    images.set(
      file,
      await emitHashed(await readFile(path.join(imgDir, file)), "assets/img/app", path.basename(file, ext), ext),
    );
  }

  const jsOn = await emitHashed(await readFile(path.join(SITE, "assets/js/js-on.js")), "assets/js", "js-on", ".js");
  return { css: await emitHashed(Buffer.from(css), "assets/css", "site", ".css"), preloads, images, jsOn };
}

function pictureFor(images, lang, copy) {
  return (id) => {
    const shot = SHOTS.find((s) => s.id === id);
    if (!shot) throw new Error(`shot "${id}" is not in scripts/lib/shots.mjs`);
    const url = (w, ext) => {
      const file = `${id}-${lang}-${w}.${ext}`;
      const hashed = images.get(file);
      if (!hashed) throw new Error(`image ${file} missing in site/assets/img/app (run scripts/images.mjs)`);
      return hashed;
    };
    const srcset = (ext) => shot.widths.map((w) => `${url(w, ext)} ${w}w`).join(", ");
    const alt = copy[`shot.${id}`];
    if (!alt?.trim()) throw new Error(`content/${lang}: missing alt text "shot.${id}"`);
    return (
      `<picture><source type="image/avif" srcset="${srcset("avif")}" sizes="${shot.sizes}">` +
      `<source type="image/webp" srcset="${srcset("webp")}" sizes="${shot.sizes}">` +
      `<img src="${url(shot.widths[0], "webp")}" alt="${escapeHtml(stripTags(alt))}" width="${shot.width}" height="${shot.height}" loading="lazy" decoding="async"></picture>`
    );
  };
}

// The home script per language: the shared code plus this language's strings and scene data (no inline script).
async function buildHomeScript(lang) {
  const source = await readFile(path.join(SITE, "assets/js/home.js"), "utf8");
  // Light, safe minification (JS budget, step0 h): drop indentation and whole-line comments. Safe because home.js
  // has no template literals or line continuations (checked here); multi-line comments only lose their indentation.
  if (/[`]|\\$/m.test(source))
    throw new Error("home.js: template literal or line continuation; extend the minifier first");
  const code = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !/^\/\*.*\*\/$/.test(line))
    .join("\n");
  const { t, d } = await readJson(path.join(SITE, "content", lang, "home-script.json"));
  // "use strict" here: biome treats .js sources as modules and drops it from home.js, but the page loads a classic script.
  const bundle = `(function(I18N, DATA){\n"use strict";\n${code}\n})(${JSON.stringify(t)}, ${JSON.stringify({ [lang]: d })});\n`;
  return emitHashed(Buffer.from(bundle), "assets/js", `home-${lang}`, ".js");
}

function alternatesFor(page) {
  const links = LANGS.filter((l) => page.paths[l]).map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${page.paths[l]}">`,
  );
  const fallback = page.paths.en ?? page.paths[LANGS.find((l) => page.paths[l])];
  links.push(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}${fallback}">`);
  return links.join("\n");
}

// Visible: the short code the design shows; read by screen readers: the language's own name.
function langSwitchFor(page, lang, home, content) {
  return LANGS.map((l) => {
    const href = page.paths[l] ?? home.paths[l];
    const current = l === lang ? ' aria-current="page"' : "";
    const name = escapeHtml(lookup(content, l, "langName"));
    return `<a href="${href}" hreflang="${l}" lang="${l}"${current}><span aria-hidden="true">${l.toUpperCase()}</span><span class="sr-only">${name}</span></a>`;
  }).join("");
}

function legalLinksFor(pages, lang, content) {
  return pages
    .filter((p) => p.footer)
    .map((p) => {
      const linkLang = p.paths[lang] ? lang : LANGS.find((l) => p.paths[l]);
      const label = escapeHtml(lookup(content, linkLang, `pages.${p.id}.title`));
      const langAttr = linkLang === lang ? "" : ` hreflang="${linkLang}" lang="${linkLang}"`;
      return `<a href="${p.paths[linkLang]}"${langAttr}>${label}</a>`;
    })
    .join("");
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
  const homeCopy = {};
  for (const lang of LANGS) {
    content[lang] = await readJson(path.join(SITE, "content", lang, "site.json"));
    homeCopy[lang] = await readJson(path.join(SITE, "content", lang, "home.json"));
  }
  const templates = {};
  for (const name of ["layout", "home", "legal", "404"]) {
    templates[name] = await readFile(path.join(SITE, "templates", `${name}.html`), "utf8");
  }
  const home = pages.find((p) => p.id === "home");
  const signInUrl = appUrl();
  const { css, preloads, images, jsOn } = await buildAssets();
  const homeScripts = {};
  for (const lang of LANGS) homeScripts[lang] = await buildHomeScript(lang);

  let count = 0;
  for (const page of pages) {
    for (const lang of LANGS.filter((l) => page.paths[l])) {
      const where = `${page.id}/${lang}`;
      const copy = homeCopy[lang];
      const isHome = page.template === "home";
      const title = isHome ? stripTags(copy["meta.title"]) : lookup(content, lang, `pages.${page.id}.title`);
      const main = isHome
        ? renderHome(templates.home, { copy, lang, picture: pictureFor(images, lang, copy) }, where)
        : render(templates[page.template], { title, draft: lookup(content, lang, "draft") }, where);
      const html = render(
        templates.layout,
        {
          lang,
          // Legal shells stay drafts until their texts land: check:prod refuses a production build with this marker.
          htmlAttrs: isHome ? "" : ' data-placeholder="legal-draft"',
          title: isHome ? title : `${title} · Loquein`,
          description: isHome ? copy["meta.desc"] : lookup(content, lang, `pages.${page.id}.description`),
          canonical: `${ORIGIN}${page.paths[lang]}`,
          alternates: alternatesFor(page),
          ogLocale: lookup(content, lang, "ogLocale"),
          preloads,
          css,
          scripts: isHome ? `<script src="${jsOn}"></script>\n<script src="${homeScripts[lang]}" defer></script>` : "",
          bodyClass: isHome ? "home" : "page",
          skip: lookup(content, lang, "skip"),
          homeHref: home.paths[lang],
          mainNav: lookup(content, lang, "mainNav"),
          navHow: copy["nav.how"],
          navProduct: copy["nav.product"],
          navSecurity: copy["nav.security"],
          navInstall: copy["nav.install"],
          navFaq: copy["nav.faq"],
          navCta: copy["nav.cta"],
          signInUrl,
          signIn: copy["nav.signin"],
          langNav: lookup(content, lang, "langNav"),
          langSwitch: langSwitchFor(page, lang, home, content),
          main,
          tag: copy["ft.tag"],
          rights: copy["ft.rights"],
          legalNav: lookup(content, lang, "legalNav"),
          legalLinks: legalLinksFor(pages, lang, content),
          contact: copy["ft.contact"],
          replay: isHome
            ? `<button class="replay" type="button" id="replay">${escapeHtml(copy["ft.replay"])}</button>`
            : "",
        },
        where,
      );
      const outDir = path.join(DIST, page.paths[lang]);
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, "index.html"), html);
      count++;
    }
  }
  await writeFile(path.join(DIST, "404.html"), render(templates["404"], { css }, "404"));
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap(pages));
  await cp(path.join(SITE, "static"), DIST, { recursive: true });
  return count;
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const count = await build();
  console.log(`build: ${count} pages + 404 -> dist/`);
}
