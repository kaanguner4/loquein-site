// Cloudflare Worker entry. Only /api/* reaches this code (run_worker_first in wrangler.jsonc);
// pages and assets are served by the static-assets layer.
import { apiJson } from "./headers";

export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS: AssetsBinding;
}

export async function handleApi(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/demo") {
    if (request.method !== "POST") {
      return apiJson(405, { error: "method_not_allowed" }, { Allow: "POST" });
    }
    // The demo form lands in LP-1b; until then the endpoint is closed.
    return apiJson(503, { error: "not_ready" });
  }
  return apiJson(404, { error: "not_found" });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request);
    // Not reached with run_worker_first ["/api/*"]; kept so a config change cannot bypass the assets layer.
    return env.ASSETS.fetch(request);
  },
};
