import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const ORIGIN = "https://loquein.com";

export interface Route {
  id: string;
  template: string;
  paths: Partial<Record<"tr" | "en" | "de", string>>;
}

export const ROUTES: Route[] = JSON.parse(readFileSync(path.join(ROOT, "site/routes.json"), "utf8")).pages;
export const HOME = ROUTES.find((r) => r.id === "home") as Route;
export const LANGS = ["tr", "en", "de"] as const;

// Every page the site serves, from the built sitemap (so the specs follow the build, not a hand list).
function sitemapPaths(): string[] {
  const file = path.join(ROOT, "dist/sitemap.xml");
  let xml: string;
  try {
    xml = readFileSync(file, "utf8");
  } catch {
    throw new Error("dist/sitemap.xml is missing: run `npm run build` first");
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

export const PAGES = sitemapPaths();
export const HOME_PATHS = Object.values(HOME.paths);
export const NOT_FOUND_PATH = "/this-page-does-not-exist/";

// Cloudflare Access service token for the preview host. Added only to requests for the site's own origin,
// so the token can never reach a third party.
export function accessHeaders(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID;
  const secret = process.env.CF_ACCESS_CLIENT_SECRET;
  return id && secret ? { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret } : {};
}

// Cookie names a remote host may set (preview: CF_Authorization from Access). Empty locally and on production.
export const ALLOWED_COOKIES = (process.env.ALLOWED_COOKIES ?? "").split(",").filter(Boolean);

// A page on the site itself, used as the referrer of an internal visit.
export const INTERNAL_PATH = "/en/privacy/";

export const test = base.extend<{ accessAuth: undefined }>({
  accessAuth: [
    async ({ context, baseURL }, use) => {
      const headers = accessHeaders();
      if (Object.keys(headers).length && baseURL) {
        const origin = new URL(baseURL).origin;
        await context.route(
          (url) => url.origin === origin,
          (route) => route.continue({ headers: { ...route.request().headers(), ...headers } }),
        );
      }
      await use(undefined);
    },
    { auto: true },
  ],
  // Pages open as for a visitor already on the site (same-origin referrer), so the home intro does not cover them.
  // An explicit `referer` (also `undefined`) wins: intro.spec.ts and the privacy spec cover arriving from outside.
  page: async ({ page, baseURL }, use) => {
    const goto = page.goto.bind(page);
    const internal = baseURL ? new URL(INTERNAL_PATH, baseURL).href : undefined;
    page.goto = (url, options) => goto(url, { referer: internal, ...options });
    await use(page);
  },
});

export { expect };

export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
}

// One line per problem, so a failing test says why in one line.
export function expectNoProblems(problems: string[]) {
  expect(problems, problems.join("\n")).toEqual([]);
}
