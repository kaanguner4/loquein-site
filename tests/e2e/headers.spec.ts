// Exact security header set on every route type (step0 d, i "Headers").
import { type APIRequestContext, type APIResponse, request as pwRequest } from "@playwright/test";
import { CACHE, COMMON, CSP, FORBIDDEN } from "./expected-headers";
import { ALLOWED_COOKIES, accessHeaders, expectNoProblems, HOME_PATHS, NOT_FOUND_PATH, test } from "./fixtures";

interface Case {
  name: string;
  method?: "GET" | "POST" | "PUT" | "OPTIONS" | "HEAD" | "DELETE";
  path: string | ((api: APIRequestContext) => Promise<string>);
  status: number;
  csp: string;
  cache: string;
  contentType?: RegExp;
  extra?: Record<string, string>;
}

async function firstAsset(api: APIRequestContext, pattern: RegExp, from: string): Promise<string> {
  const body = await (await api.get(from)).text();
  const match = body.match(pattern);
  if (!match) throw new Error(`no asset matching ${pattern} in ${from}`);
  return match[1];
}
const cssPath = (api: APIRequestContext) => firstAsset(api, /href="(\/assets\/css\/[^"]+\.css)"/, "/");
const fontPath = async (api: APIRequestContext) =>
  firstAsset(api, /url\("(\/assets\/fonts\/[^"]+\.woff2)"\)/, await cssPath(api));
const homeJsPath = (api: APIRequestContext) => firstAsset(api, /src="(\/assets\/js\/home-tr\.[^"]+\.js)"/, "/");
const jsOnPath = (api: APIRequestContext) => firstAsset(api, /src="(\/assets\/js\/js-on\.[^"]+\.js)"/, "/");
const avifPath = (api: APIRequestContext) => firstAsset(api, /srcset="(\/assets\/img\/app\/[^" ]+\.avif)/, "/");
const webpPath = (api: APIRequestContext) => firstAsset(api, /src="(\/assets\/img\/app\/[^"]+\.webp)"/, "/");
const uiSvgPath = async (api: APIRequestContext) =>
  firstAsset(api, /url\("(\/assets\/img\/ui\/[^"]+\.svg)"\)/, await cssPath(api));

const CASES: Case[] = [
  ...HOME_PATHS.map((p) => ({
    name: `home ${p}`,
    path: p,
    status: 200,
    csp: CSP.home,
    cache: CACHE.revalidate,
    contentType: /^text\/html/,
  })),
  {
    name: "legal TR",
    path: "/kvkk-aydinlatma-metni/",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/html/,
  },
  {
    name: "legal EN",
    path: "/en/privacy/",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/html/,
  },
  {
    name: "legal DE Impressum",
    path: "/de/impressum/",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/html/,
  },
  { name: "css", path: cssPath, status: 200, csp: CSP.page, cache: CACHE.immutable, contentType: /^text\/css/ },
  { name: "font", path: fontPath, status: 200, csp: CSP.page, cache: CACHE.immutable, contentType: /^font\/woff2/ },
  {
    name: "home script",
    path: homeJsPath,
    status: 200,
    csp: CSP.page,
    cache: CACHE.immutable,
    contentType: /javascript/,
  },
  {
    name: "js-on script",
    path: jsOnPath,
    status: 200,
    csp: CSP.page,
    cache: CACHE.immutable,
    contentType: /javascript/,
  },
  {
    name: "screenshot avif",
    path: avifPath,
    status: 200,
    csp: CSP.page,
    cache: CACHE.immutable,
    contentType: /^image\/avif/,
  },
  {
    name: "screenshot webp",
    path: webpPath,
    status: 200,
    csp: CSP.page,
    cache: CACHE.immutable,
    contentType: /^image\/webp/,
  },
  {
    name: "ui svg",
    path: uiSvgPath,
    status: 200,
    csp: CSP.page,
    cache: CACHE.immutable,
    contentType: /^image\/svg\+xml/,
  },
  {
    name: "robots.txt",
    path: "/robots.txt",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/plain/,
  },
  {
    name: "security.txt",
    path: "/.well-known/security.txt",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/plain/,
  },
  { name: "sitemap.xml", path: "/sitemap.xml", status: 200, csp: CSP.page, cache: CACHE.revalidate },
  {
    name: "favicon",
    path: "/favicon.svg",
    status: 200,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^image\/svg\+xml/,
  },
  {
    name: "404 page",
    path: NOT_FOUND_PATH,
    status: 404,
    csp: CSP.page,
    cache: CACHE.revalidate,
    contentType: /^text\/html/,
  },
  { name: "_headers is not served", path: "/_headers", status: 404, csp: CSP.page, cache: CACHE.revalidate },
  {
    name: "redirect /en -> /en/",
    path: "/en",
    status: 307,
    csp: CSP.page,
    cache: CACHE.revalidate,
    extra: { location: "/en/" },
  },
  {
    name: "api POST /api/demo (stub)",
    method: "POST",
    path: "/api/demo",
    status: 503,
    csp: CSP.api,
    cache: CACHE.api,
    contentType: /^application\/json/,
  },
  {
    name: "api GET /api/demo",
    method: "GET",
    path: "/api/demo",
    status: 405,
    csp: CSP.api,
    cache: CACHE.api,
    extra: { allow: "POST" },
  },
  {
    name: "api PUT /api/demo",
    method: "PUT",
    path: "/api/demo",
    status: 405,
    csp: CSP.api,
    cache: CACHE.api,
    extra: { allow: "POST" },
  },
  {
    name: "api OPTIONS /api/demo",
    method: "OPTIONS",
    path: "/api/demo",
    status: 405,
    csp: CSP.api,
    cache: CACHE.api,
    extra: { allow: "POST" },
  },
  {
    name: "api unknown route",
    method: "POST",
    path: "/api/nope",
    status: 404,
    csp: CSP.api,
    cache: CACHE.api,
    contentType: /^application\/json/,
  },
];

function problemsFor(c: Case, res: APIResponse): string[] {
  const out: string[] = [];
  const all = res.headersArray().map((h) => ({ name: h.name.toLowerCase(), value: h.value }));
  const values = (name: string) => all.filter((h) => h.name === name).map((h) => h.value);
  const expectOne = (name: string, expected: string) => {
    const got = values(name);
    // A wrong count names every value and every header name, so the log says which layer added the extra one.
    if (got.length !== 1)
      out.push(
        `${name}: expected exactly one header, got ${got.length}: ${JSON.stringify(got)}; response header names: ${all.map((h) => h.name).join(",")}`,
      );
    else if (got[0] !== expected) out.push(`${name}: "${got[0]}" != expected "${expected}"`);
  };
  if (res.status() !== c.status) out.push(`status ${res.status()} != expected ${c.status}`);
  for (const [name, value] of Object.entries(COMMON)) expectOne(name, value);
  expectOne("content-security-policy", c.csp);
  expectOne("cache-control", c.cache);
  for (const [name, value] of Object.entries(c.extra ?? {})) expectOne(name, value);
  const type = values("content-type")[0] ?? "";
  if (c.contentType && !c.contentType.test(type)) out.push(`content-type "${type}" does not match ${c.contentType}`);
  for (const name of FORBIDDEN) if (values(name).length) out.push(`${name} must not be set`);
  for (const cookie of values("set-cookie")) {
    const name = cookie.split("=")[0].trim();
    if (!ALLOWED_COOKIES.includes(name)) out.push(`set-cookie ${name} is not allowed`);
  }
  const scriptSrc = (values("content-security-policy")[0] ?? "").match(/script-src ([^;]*)/)?.[1] ?? "";
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "*", "data:", "blob:"]) {
    if (scriptSrc.split(/\s+/).includes(bad)) out.push(`script-src contains ${bad}`);
  }
  return out.map((p) => `${c.name}: ${p}`);
}

let api: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  const local = !process.env.BASE_URL;
  api = await pwRequest.newContext({
    baseURL,
    extraHTTPHeaders: accessHeaders(),
    maxRedirects: 0,
    ignoreHTTPSErrors: local,
  });
});
test.afterAll(async () => api.dispose());

for (const c of CASES) {
  test(`headers: ${c.name}`, async () => {
    const path = typeof c.path === "string" ? c.path : await c.path(api);
    const res = await api.fetch(path, { method: c.method ?? "GET", maxRedirects: 0 });
    expectNoProblems(problemsFor(c, res));
  });
}

test("api: stub body is {error: not_ready}", async () => {
  const res = await api.post("/api/demo", { data: { name: "x" } });
  expectNoProblems(JSON.stringify(await res.json()) === '{"error":"not_ready"}' ? [] : [`body ${await res.text()}`]);
});
