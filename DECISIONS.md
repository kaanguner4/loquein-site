# Decisions

Newest first. Package LP plans live outside this repo (brief + Step 0); this file keeps the decisions the code relies on.

## 2026-11-22 — LP-1a (implementation)
- Worker unit tests run in plain vitest (Node) instead of `@cloudflare/vitest-pool-workers`: the pool pins vitest 4 and ships a second wrangler; the real runtime is covered by Playwright against `wrangler dev`. LP-1b may add the pool for bindings.
- Local/CI server is `wrangler dev --local-protocol https`: WebKit applies `upgrade-insecure-requests` to http://127.0.0.1 and the CSS fails to load over plain HTTP.
- `X-Robots-Tag: noindex, nofollow` on every response, `<meta name="robots" content="noindex">` and `robots.txt` `Disallow: /` until LP-go.
- Home pages already carry the Turnstile CSP origins of step0 d, so LP-1b does not change headers; nothing loads from them yet.
- Image pipeline (sharp) and the intro, image and form specs come with the content that needs them (LP-1b/LP-1c); check-dist already enforces the image rules.

## 2026-11-22 — Step 0 (k1–k12, approved by Kaan)
- k1: separate public repo `kaanguner4/loquein-site`.
- k2: Cloudflare Workers with static assets (one Worker: assets + `POST /api/demo`).
- k3: deploy by GitHub Actions with a scoped API token in GitHub environments; preview in the zone behind Access; production by approved dispatch; token rotated every 90 days.
- k4: demo mail via Resend on `notify.loquein.com` (eu-west-1, restricted key); apex no-mail records unchanged.
- k5: Turnstile Managed, lazy on first form focus, pre-clearance off, plus honeypot and rate limit; fall back to honeypot + rate limit if it sets storage or breaks the CSP.
- k6: no prices; "contact us for a quote" (Kaan, superseding the "pilot" option).
- k7: postal address for the privacy notice: company or virtual office, decided before LP-go, never the home address.
- k8: security.txt contact `mailto:guner.kaan@outlook.com` until MV, then `security@loquein.com`.
- k9: demo mails are deleted 12 months after the last contact.
- k10: intro kept at ~3.2 s, home pages only, external referrer only (no storage), skip button + Esc, none for reduced motion, built by JS (Kaan).
- k11: HSTS preload decided 30 days after go-live.
- k12: no analytics (zone traffic analytics only).
