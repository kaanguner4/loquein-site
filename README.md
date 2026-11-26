# loquein-site

The loquein.com landing page: a static site (Turkish `/`, English `/en/`, German `/de/` plus legal pages) built by
a zero-dependency Node script and served by one Cloudflare Worker with static assets. The Worker itself only answers
`/api/*` (the demo form endpoint, a `503 not_ready` stub until LP-1b). No cookies, no storage, no third-party requests;
every response carries a strict CSP and the security header set from `site/static/_headers` / `worker/headers.ts`.

Status: **preview** (LP-1c). The home pages carry the approved landing design (v13) with the real app screenshots;
the demo form arrives in LP-1b (until then the contact section is a mail link). Legal pages are still draft shells,
everything is `noindex` and `robots.txt` disallows all. A production deploy is refused while a draft page exists
(`npm run check:prod`).

## Run locally

Node 26 LTS (`.nvmrc`), then:

```sh
npm ci
npx playwright install chromium firefox webkit   # once
npm run dev        # build + wrangler dev on https://127.0.0.1:8787 (self-signed certificate)
npm run verify     # everything CI runs: lint, typecheck, build, dist/link/HTML checks, wrangler dry-run, unit, e2e
```

Layout: `site/` (templates, content per language, CSS, JS, fonts, images, static files incl. `_headers`,
`robots.txt`, `.well-known/security.txt`), `worker/` (Worker code), `scripts/` (build + dist checks), `tests/unit/`
(vitest), `tests/e2e/` (Playwright: headers, privacy inventory, CSP, axe, i18n, no-JS, assets, intro, images).

Home page: `site/templates/home.html` + `site/content/<lang>/home.json` (copy) + `home-script.json` (scene data for
`site/assets/js/home.js`), styles in `site/assets/css/landing.css`. Screenshots: `node scripts/images.mjs <dir>` turns
the UI-close PNGs (`<screen>-<lang>.png`) into the committed AVIF/WebP files in `site/assets/img/app/`. The privacy spec writes the
cookie/storage inventory to `inventory/inventory.json` (a CI artifact).

## Deploy

GitHub Actions only (`.github/workflows/deploy.yml`); never run `wrangler deploy` by hand and never without `--env`.

- Push to `main`: deploy `--env preview` to https://preview.loquein.com (Cloudflare Access), then the header and
  privacy specs run against it with the Access service token.
- Production: Actions → Deploy → Run workflow → target `production`; the `production` environment needs Kaan's approval.
- Secrets live only in the GitHub environments: `preview` = `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`; `production` = the first two. Missing secrets stop the job at its
  first step with one error line. The API token is rotated every 90 days.
- Rollback: Cloudflare dashboard → Workers → Deployments → Rollback, or `wrangler rollback <version-id>`.
