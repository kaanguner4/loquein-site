// Helpers shared by check-dist and check-links: walk dist/, map URL paths to files, read tags.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const ORIGIN = "https://loquein.com";
// English first (also the order of the language switch and of hreflang), then Turkish, then German.
export const LANGS = ["en", "tr", "de"];

// The only two targets of the header sign-in link: the production app, and Kaan's local app for the preview demo.
export const APP_URLS = { production: "https://app.loquein.com", preview: "http://localhost:5173" };

export function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out.sort();
}

export const htmlFiles = (dir) => walk(dir).filter((f) => f.endsWith(".html"));

// "kvkk/index.html" -> "/kvkk/"; "404.html" -> "/404.html"
export function urlPathOf(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`;
  return `/${file}`;
}

// URL path -> dist file, or null. A path to a directory without a trailing slash is a redirect: null.
export function fileFor(dir, urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  const rel = clean.endsWith("/") ? `${clean}index.html` : clean;
  const root = path.resolve(dir);
  const full = path.resolve(root, `.${rel}`);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
  return existsSync(full) && statSync(full).isFile() ? full : null;
}

export const read = (file) => readFileSync(file, "utf8");

// Opening tags with their attributes. Good enough for our own generated HTML; html-validate checks syntax.
export function tags(html) {
  const out = [];
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*?)?\s*\/?>/g;
  for (const m of html.matchAll(tagRe)) {
    const attrs = {};
    const attrRe = /([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const a of (m[2] ?? "").matchAll(attrRe)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? "";
    out.push({ name: m[1].toLowerCase(), attrs, raw: m[0] });
  }
  return out;
}

export const textOf = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
