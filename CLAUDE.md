# loquein-site — rules for every session

- Never commit to `main`; branch, PR to `main`, merge commit only, merge only when every check on the PR is green.
- No secret in code, commits, logs or reports. Cloudflare credentials live only in GitHub environments; Worker secrets
  only via `wrangler secret put` typed by Kaan.
- Every response keeps the header set (`site/static/_headers` for assets, `worker/headers.ts` for `/api/*`,
  expected values in `tests/e2e/expected-headers.ts`). No inline script/style, no third-party request, no cookie.
- Pin every dependency exactly; GitHub Actions by full commit SHA; workflows default to `contents: read`.
- Run `npm run verify` before pushing. Decisions go to `DECISIONS.md` (newest first), history to `CHANGELOG.md`.
