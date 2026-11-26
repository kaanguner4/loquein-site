// Cookie + storage inventory and third-party request check on every page (step0 e). Expected: nothing.
// Each test writes its row to inventory/parts/; inventory-teardown.ts merges them into inventory/inventory.json.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Frame } from "@playwright/test";
import { ALLOWED_COOKIES, expectNoProblems, HOME_PATHS, NOT_FOUND_PATH, PAGES, scrollThrough, test } from "./fixtures";

const IDLE_MS = Number(process.env.PRIVACY_IDLE_MS ?? 5000);
export const PARTS_DIR = path.resolve(import.meta.dirname, "../../inventory/parts");

interface FrameStorage {
  url: string;
  localStorage: number;
  sessionStorage: number;
  indexedDB: number;
  caches: number;
  serviceWorkers: number;
  error?: string;
}

async function storageOf(frame: Frame): Promise<FrameStorage> {
  const url = frame.url();
  try {
    return await frame.evaluate(async () => {
      const safe = async (fn: () => Promise<number> | number) => {
        try {
          return await fn();
        } catch {
          return -1;
        }
      };
      return {
        url: location.href,
        localStorage: await safe(() => localStorage.length),
        sessionStorage: await safe(() => sessionStorage.length),
        indexedDB: await safe(async () => (indexedDB.databases ? (await indexedDB.databases()).length : 0)),
        caches: await safe(async () => (self.caches ? (await caches.keys()).length : 0)),
        serviceWorkers: await safe(async () =>
          navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
        ),
      };
    });
  } catch (e) {
    return {
      url,
      localStorage: -1,
      sessionStorage: -1,
      indexedDB: -1,
      caches: -1,
      serviceWorkers: -1,
      error: String(e),
    };
  }
}

const visits = [
  ...PAGES.map((p) => ({ path: p, referer: undefined as string | undefined })),
  { path: NOT_FOUND_PATH, referer: undefined },
  // Arriving from another site (the LP-1c intro plays only then): must not change the inventory.
  ...HOME_PATHS.map((p) => ({ path: p, referer: "https://example.org/" })),
];

for (const visit of visits) {
  const label = `${visit.path}${visit.referer ? " (external referrer)" : ""}`;
  test(`privacy: ${label}`, async ({ page, context, baseURL, browserName }) => {
    const origin = new URL(baseURL as string).origin;
    const requests: string[] = [];
    const setCookies: string[] = [];
    const failed: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("requestfailed", (r) => failed.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on("response", async (r) => {
      const v = await r.headerValue("set-cookie").catch(() => null);
      if (v) setCookies.push(...v.split("\n").map((c) => c.split("=")[0].trim()));
    });

    await page.goto(visit.path, { referer: visit.referer, waitUntil: "load" });
    await scrollThrough(page);
    await page.waitForTimeout(IDLE_MS);

    const cookies = (await context.cookies()).map((c) => ({ name: c.name, domain: c.domain }));
    const frames = await Promise.all(page.frames().map(storageOf));
    const thirdParty = [...new Set(requests.filter((u) => !u.startsWith(`${origin}/`) && !u.startsWith("data:")))];

    const entry = {
      browser: browserName,
      path: visit.path,
      referer: visit.referer ?? null,
      cookies,
      setCookies,
      frames,
      thirdParty,
    };
    mkdirSync(PARTS_DIR, { recursive: true });
    const slug = `${browserName}${visit.path.replace(/[^a-z0-9]+/gi, "_")}${visit.referer ? "_ref" : ""}`;
    writeFileSync(path.join(PARTS_DIR, `${slug}.json`), JSON.stringify(entry, null, 2));

    const problems: string[] = [];
    for (const c of cookies) if (!ALLOWED_COOKIES.includes(c.name)) problems.push(`cookie ${c.name} (${c.domain})`);
    for (const n of setCookies) if (!ALLOWED_COOKIES.includes(n)) problems.push(`Set-Cookie ${n}`);
    for (const f of frames) {
      if (f.error) problems.push(`frame ${f.url}: storage not readable (${f.error.split("\n")[0]})`);
      for (const key of ["localStorage", "sessionStorage", "indexedDB", "caches", "serviceWorkers"] as const) {
        if (f[key] !== 0) problems.push(`frame ${f.url}: ${key} = ${f[key]}`);
      }
    }
    for (const u of thirdParty) problems.push(`third-party request ${u}`);
    if (thirdParty.length) {
      // Which element asked for it: a script in the built page, or one the edge added to the HTML.
      const html = await page.content();
      const tags = [...html.matchAll(/<(?:script|link|img|iframe)\b[^>]*>/gi)]
        .map((m) => m[0])
        .filter((t) => thirdParty.some((u) => t.includes(new URL(u).host)))
        .map((t) => t.replace(/(data-cf-beacon|nonce)=("[^"]*"|'[^']*')/gi, "$1=…"));
      problems.push(`elements naming those hosts in the DOM: ${tags.length ? tags.join(" ") : "none"}`);
    }
    for (const f of failed) problems.push(`failed request ${f}`);
    expectNoProblems(problems);
  });
}
