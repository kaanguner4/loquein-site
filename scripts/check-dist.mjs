// Static rules on the built site (step0 d + i). Usage: node scripts/check-dist.mjs dist [--production]
// Every problem is one line: "<file>: <rule>".
import { existsSync } from "node:fs";
import path from "node:path";
import { fileFor, htmlFiles, LANGS, ORIGIN, read, tags, textOf, urlPathOf } from "./lib/dist.mjs";

const DAY = 86_400_000;
const RESOURCE_ATTRS = {
  link: ["href"],
  script: ["src"],
  img: ["src", "srcset"],
  source: ["src", "srcset"],
  iframe: ["src"],
};
// Links to other sites need an entry here (none yet). mailto: only to the published contact.
export const EXTERNAL_LINK_ALLOWLIST = ["mailto:guner.kaan@outlook.com"];
const GERMAN_QUESTION_CLAIM = /auf Deutsch (fragen|stellen)|Fragen auf Deutsch|deutsche Fragen/i;

const srcsetUrls = (value) =>
  value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

function checkHtml(dir, file, html, { production }) {
  const problems = [];
  const add = (rule) => problems.push(`${file}: ${rule}`);
  const all = tags(html);

  if (/<style[\s>]/i.test(html)) add("inline <style> element");
  if (/javascript:/i.test(html)) add("javascript: URL");
  const text = textOf(html);
  const placeholder = text.match(/\[[A-Z ]{3,}\]/);
  if (placeholder) add(`placeholder text ${placeholder[0]}`);
  if (/test page/i.test(text)) add('"test page" text');
  if (production && /\sdata-placeholder[\s=>]/.test(html)) add("placeholder marker in a production build");

  for (const tag of all) {
    for (const attr of Object.keys(tag.attrs)) {
      if (attr === "style") add(`style attribute on <${tag.name}>`);
      if (/^on[a-z]+$/.test(attr)) add(`event handler attribute ${attr} on <${tag.name}>`);
    }
    if (tag.name === "script" && !("src" in tag.attrs)) add("inline <script>");
    for (const attr of RESOURCE_ATTRS[tag.name] ?? []) {
      if (!(attr in tag.attrs)) continue;
      if (tag.name === "link" && ["canonical", "alternate"].includes(tag.attrs.rel)) continue;
      const urls = attr === "srcset" ? srcsetUrls(tag.attrs[attr]) : [tag.attrs[attr]];
      for (const url of urls) {
        if (!url.startsWith("/") || url.startsWith("//")) add(`external resource ${url} on <${tag.name}>`);
      }
    }
    if (tag.name === "a" && "href" in tag.attrs) {
      const href = tag.attrs.href;
      const external = /^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith(`${ORIGIN}/`);
      if (external && !EXTERNAL_LINK_ALLOWLIST.includes(href)) add(`external link ${href} not in the allowlist`);
    }
    if (tag.name === "img") {
      if (!tag.attrs.width || !tag.attrs.height) add(`<img ${tag.attrs.src ?? ""}> without width/height`);
      if (!tag.attrs.alt?.trim()) add(`<img ${tag.attrs.src ?? ""}> without alt text`);
      if (tag.attrs.loading === "lazy" && tag.attrs.fetchpriority === "high") add("LCP image is lazy-loaded");
    }
  }

  for (const picture of html.matchAll(/<picture[\s>][\s\S]*?<\/picture>/gi)) {
    const sources = tags(picture[0]).filter((t) => t.name === "source");
    for (const type of ["image/avif", "image/webp"]) {
      if (!sources.some((s) => s.attrs.type === type)) add(`<picture> without a ${type} source`);
    }
    for (const s of sources) {
      for (const url of srcsetUrls(s.attrs.srcset ?? "")) {
        if (url.startsWith("/") && !fileFor(dir, url)) add(`<picture> source ${url} missing in dist`);
      }
    }
  }
  return problems;
}

function checkPageMeta(dir, file, html) {
  const problems = [];
  const add = (rule) => problems.push(`${file}: ${rule}`);
  const all = tags(html);
  const htmlTag = all.find((t) => t.name === "html");
  const lang = htmlTag?.attrs.lang;
  if (!LANGS.includes(lang)) add(`<html lang> is "${lang ?? ""}", expected one of ${LANGS.join("/")}`);
  if (!/<title>[^<]*\S[^<]*<\/title>/.test(html)) add("missing <title>");
  const desc = all.find((t) => t.name === "meta" && t.attrs.name === "description");
  if (!desc?.attrs.content?.trim()) add("missing meta description");

  const self = `${ORIGIN}${urlPathOf(file)}`;
  const canonical = all.find((t) => t.name === "link" && t.attrs.rel === "canonical");
  if (canonical?.attrs.href !== self) add(`canonical is "${canonical?.attrs.href ?? ""}", expected ${self}`);

  const alternates = all.filter((t) => t.name === "link" && t.attrs.rel === "alternate" && t.attrs.hreflang);
  const byLang = new Map(alternates.map((t) => [t.attrs.hreflang, t.attrs.href]));
  if (byLang.get(lang) !== self) add(`no self-referencing hreflang="${lang}"`);
  if (!byLang.has("x-default")) add('no hreflang="x-default"');
  for (const [hl, href] of byLang) {
    if (hl !== "x-default" && !LANGS.includes(hl)) add(`unexpected hreflang="${hl}"`);
    if (!href?.startsWith(`${ORIGIN}/`)) {
      add(`hreflang="${hl}" href is not on ${ORIGIN}`);
      continue;
    }
    const target = fileFor(dir, href.slice(ORIGIN.length));
    if (!target) {
      add(`hreflang="${hl}" points to a missing page ${href}`);
      continue;
    }
    if (hl === "x-default") continue;
    const back = tags(read(target)).filter((t) => t.name === "link" && t.attrs.rel === "alternate");
    if (!back.some((t) => t.attrs.hreflang === lang && t.attrs.href === self)) {
      add(`hreflang="${hl}" page ${href} does not link back with hreflang="${lang}"`);
    }
  }
  if (lang === "de" && GERMAN_QUESTION_CLAIM.test(textOf(html))) add("German copy promises German questions");
  return problems;
}

function checkSecurityTxt(dir, now) {
  const file = path.join(dir, ".well-known/security.txt");
  if (!existsSync(file)) return [".well-known/security.txt: missing"];
  const problems = [];
  const add = (rule) => problems.push(`.well-known/security.txt: ${rule}`);
  const body = read(file);
  for (const field of ["Contact", "Expires", "Preferred-Languages", "Canonical"]) {
    if (!new RegExp(`^${field}: \\S`, "m").test(body)) add(`missing ${field}`);
  }
  const expires = Date.parse(body.match(/^Expires: (\S+)$/m)?.[1] ?? "");
  if (Number.isNaN(expires)) add("Expires is not a date");
  else if (expires - now < 60 * DAY) add(`Expires ${new Date(expires).toISOString()} is less than 60 days away`);
  else if (expires - now > 366 * DAY) add(`Expires ${new Date(expires).toISOString()} is more than a year away`);
  return problems;
}

export function checkDist(dir, { production = false, now = Date.now() } = {}) {
  if (!existsSync(dir)) return [`${dir}: missing (run npm run build)`];
  const problems = [];
  for (const required of ["_headers", "robots.txt", "404.html", "sitemap.xml"]) {
    if (!existsSync(path.join(dir, required))) problems.push(`${required}: missing`);
  }
  for (const file of htmlFiles(dir)) {
    const html = read(path.join(dir, file));
    problems.push(...checkHtml(dir, file, html, { production }));
    if (file !== "404.html") problems.push(...checkPageMeta(dir, file, html));
  }
  problems.push(...checkSecurityTxt(dir, now));
  return problems;
}

if (import.meta.main) {
  const dir = path.resolve(process.argv[2] ?? "dist");
  const production = process.argv.includes("--production");
  const problems = checkDist(dir, { production });
  for (const p of problems) console.error(`check-dist: ${p}`);
  console.log(
    `check-dist${production ? " (production)" : ""}: ${htmlFiles(dir).length} HTML files, ${problems.length} problem(s)`,
  );
  process.exit(problems.length ? 1 : 0);
}
