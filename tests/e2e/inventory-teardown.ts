// Merges the per-test privacy rows into inventory/inventory.json (uploaded as a CI artifact).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Entry {
  browser: string;
  cookies: unknown[];
  setCookies: unknown[];
  thirdParty: unknown[];
  frames: Record<string, number | string>[];
}

export default function teardown() {
  const dir = path.resolve(import.meta.dirname, "../../inventory");
  const parts = path.join(dir, "parts");
  if (!existsSync(parts)) return;
  const entries: Entry[] = readdirSync(parts)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(parts, f), "utf8")));
  const storageKeys = ["localStorage", "sessionStorage", "indexedDB", "caches", "serviceWorkers"];
  const summary = {
    visits: entries.length,
    browsers: [...new Set(entries.map((e) => e.browser))].sort(),
    cookies: entries.reduce((n, e) => n + e.cookies.length + e.setCookies.length, 0),
    storageItems: entries.reduce(
      (n, e) =>
        n + e.frames.reduce((m, f) => m + storageKeys.reduce((k, key) => k + Math.abs(Number(f[key]) || 0), 0), 0),
      0,
    ),
    thirdPartyRequests: entries.reduce((n, e) => n + e.thirdParty.length, 0),
  };
  writeFileSync(
    path.join(dir, "inventory.json"),
    JSON.stringify({ baseURL: process.env.BASE_URL ?? "https://127.0.0.1:8787", summary, entries }, null, 2),
  );
  console.log(`inventory: ${JSON.stringify(summary)}`);
}
