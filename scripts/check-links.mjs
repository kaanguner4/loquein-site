// Internal link + #anchor check on dist/. Usage: node scripts/check-links.mjs dist
// Every problem is one line: "<file>: <link> -> <reason>".
import path from "node:path";
import { EXTERNAL_LINK_ALLOWLIST } from "./check-dist.mjs";
import { fileFor, htmlFiles, ORIGIN, read, tags, urlPathOf, walk } from "./lib/dist.mjs";

const LINK_ATTRS = ["href", "src", "srcset"];
const idsOf = (html) => new Set(tags(html).flatMap((t) => (t.attrs.id ? [t.attrs.id] : [])));

function refsInHtml(html) {
  const refs = [];
  for (const tag of tags(html)) {
    if (tag.name === "link" && ["canonical", "alternate"].includes(tag.attrs.rel)) {
      refs.push(tag.attrs.href);
      continue;
    }
    for (const attr of LINK_ATTRS) {
      if (!(attr in tag.attrs)) continue;
      if (attr === "srcset") refs.push(...tag.attrs.srcset.split(",").map((p) => p.trim().split(/\s+/)[0]));
      else refs.push(tag.attrs[attr]);
    }
  }
  return refs.filter(Boolean);
}

export function checkLinks(dir) {
  const problems = [];
  let checked = 0;
  const check = (file, fromPath, ref) => {
    checked++;
    if (EXTERNAL_LINK_ALLOWLIST.includes(ref)) return;
    if (/^mailto:/i.test(ref)) {
      problems.push(`${file}: ${ref} -> mailto not in the allowlist`);
      return;
    }
    let target = ref;
    if (ref.startsWith(`${ORIGIN}/`)) target = ref.slice(ORIGIN.length);
    else if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//")) {
      problems.push(`${file}: ${ref} -> external link not in the allowlist`);
      return;
    }
    const resolved = new URL(target, `http://dist${fromPath}`);
    const targetFile = fileFor(dir, resolved.pathname);
    if (!targetFile) {
      const hint = fileFor(dir, `${resolved.pathname}/`) ? " (add the trailing slash)" : "";
      problems.push(`${file}: ${ref} -> no such file${hint}`);
      return;
    }
    const anchor = decodeURIComponent(resolved.hash.slice(1));
    if (anchor && !idsOf(read(targetFile)).has(anchor))
      problems.push(`${file}: ${ref} -> no element with id "${anchor}"`);
  };
  for (const file of htmlFiles(dir)) {
    for (const ref of refsInHtml(read(path.join(dir, file)))) check(file, urlPathOf(file), ref);
  }
  for (const file of walk(dir).filter((f) => f.endsWith(".css"))) {
    for (const m of read(path.join(dir, file)).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      check(file, `/${file}`, m[1]);
    }
  }
  return { problems, checked };
}

if (import.meta.main) {
  const dir = path.resolve(process.argv[2] ?? "dist");
  const { problems, checked } = checkLinks(dir);
  for (const p of problems) console.error(`check-links: ${p}`);
  console.log(`check-links: ${checked} links checked, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
}
