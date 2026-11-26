import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { API_HEADERS, COMMON_HEADERS } from "../../worker/headers";
import worker, { type Env } from "../../worker/index";
import { CACHE, COMMON, CSP } from "../e2e/expected-headers";

const ROOT = path.resolve(import.meta.dirname, "../..");

function envWithAssets() {
  const fetch = vi.fn(async (_req: Request) => new Response("asset", { status: 200 }));
  return { env: { ASSETS: { fetch } } satisfies Env, fetch };
}

const call = (method: string, url: string, init: RequestInit = {}) => {
  const { env, fetch } = envWithAssets();
  return { res: worker.fetch(new Request(`https://loquein.com${url}`, { method, ...init }), env), assets: fetch };
};

function headerProblems(res: Response): string[] {
  const out: string[] = [];
  for (const [name, value] of Object.entries(COMMON)) {
    if (res.headers.get(name) !== value) out.push(`${name}: "${res.headers.get(name)}" != "${value}"`);
  }
  if (res.headers.get("content-security-policy") !== CSP.api)
    out.push(`csp: ${res.headers.get("content-security-policy")}`);
  if (res.headers.get("cache-control") !== CACHE.api) out.push(`cache-control: ${res.headers.get("cache-control")}`);
  if (res.headers.has("set-cookie")) out.push("set-cookie present");
  for (const [name] of res.headers) if (name.startsWith("access-control-")) out.push(`${name} present`);
  return out;
}

describe("POST /api/demo (stub until LP-1b)", () => {
  it("answers 503 not_ready as JSON with the API header set", async () => {
    const { res, assets } = call("POST", "/api/demo", {
      body: '{"name":"x"}',
      headers: { "content-type": "application/json" },
    });
    const r = await res;
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "not_ready" });
    expect(r.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(headerProblems(r)).toEqual([]);
    expect(assets).not.toHaveBeenCalled();
  });
});

describe("method checks on /api/demo", () => {
  for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    it(`${method} -> 405 with Allow: POST`, async () => {
      const r = await call(method, "/api/demo").res;
      expect(r.status).toBe(405);
      expect(r.headers.get("allow")).toBe("POST");
      expect(headerProblems(r)).toEqual([]);
    });
  }
});

describe("unknown API routes", () => {
  for (const url of ["/api/", "/api/demo/", "/api/demo2", "/api/nope?x=1"]) {
    it(`${url} -> 404 not_found`, async () => {
      const r = await call("POST", url).res;
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ error: "not_found" });
      expect(headerProblems(r)).toEqual([]);
    });
  }
});

describe("non-API paths", () => {
  it("are handed to the assets binding unchanged", async () => {
    const { res, assets } = call("GET", "/tr/");
    expect(await (await res).text()).toBe("asset");
    expect(assets).toHaveBeenCalledOnce();
    expect(new URL((assets.mock.calls[0][0] as Request).url).pathname).toBe("/tr/");
  });
});

describe("header sources stay in sync", () => {
  // Parse one rule block of _headers: Worker responses must carry the same common set as static assets.
  const lines = readFileSync(path.join(ROOT, "site/static/_headers"), "utf8").split("\n");
  const parseBlock = (rule: string): Record<string, string> => {
    const start = lines.indexOf(rule);
    expect(start, `rule ${rule} in _headers`).toBeGreaterThanOrEqual(0);
    const out: Record<string, string> = {};
    for (const line of lines.slice(start + 1)) {
      if (!line.startsWith("  ")) break;
      const i = line.indexOf(":");
      out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    }
    return out;
  };
  // The page CSP is not in "/*" (it would reach "/" next to the home CSP); two rules that skip "/" carry it.
  const common = parseBlock("/*");
  const pageCsp = parseBlock("/:seg");
  const block = { ...common, ...pageCsp };

  it("the page CSP is set by rules that do not match '/', never by '/*'", () => {
    expect(common["content-security-policy"]).toBeUndefined();
    expect(parseBlock("/:seg/*")).toEqual(pageCsp);
    expect(parseBlock("/")["content-security-policy"]).toBe(CSP.home);
  });

  it("worker COMMON_HEADERS == the common part of _headers /*", () => {
    const lower = Object.fromEntries(Object.entries(COMMON_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
    const { "content-security-policy": _csp, "cache-control": _cache, ...rest } = block;
    expect(lower).toEqual(rest);
  });

  it("both match the step0 d table in tests/e2e/expected-headers.ts", () => {
    const lower = Object.fromEntries(Object.entries(API_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
    expect(lower).toEqual({ ...COMMON, "content-security-policy": CSP.api, "cache-control": CACHE.api });
    expect(block["content-security-policy"]).toBe(CSP.page);
    expect(block["cache-control"]).toBe(CACHE.revalidate);
  });
});
