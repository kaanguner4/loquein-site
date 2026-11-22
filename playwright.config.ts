import { defineConfig, devices } from "@playwright/test";

// Local and CI: against `wrangler dev` on https://127.0.0.1:8787 (built dist/, wrangler's self-signed certificate).
// HTTPS because the CSP's upgrade-insecure-requests makes WebKit upgrade http://127.0.0.1 subresources. Remote (deploy.yml): BASE_URL is set and
// only the header + privacy specs run; Access service-token headers are added per request in tests/e2e/fixtures.ts.
const remote = Boolean(process.env.BASE_URL);
const baseURL = process.env.BASE_URL ?? "https://127.0.0.1:8787";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalTeardown: "./tests/e2e/inventory-teardown.ts",
  use: {
    baseURL,
    ignoreHTTPSErrors: !remote,
    // Traces record request headers; on remote runs those carry the Access service token, so no traces there.
    trace: remote ? "off" : "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: remote
    ? undefined
    : {
        command:
          "npx wrangler dev --ip 127.0.0.1 --port 8787 --local-protocol https --show-interactive-dev-session=false",
        url: `${baseURL}/robots.txt`,
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: { WRANGLER_SEND_METRICS: "false" },
      },
});
