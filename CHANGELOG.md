# Changelog

## LP-1d — 2026-11-26
- Deploy: "Wait until preview serves this build" counts a curl error (exit 6, name not yet resolvable on a first deploy) as one
  failed try; each try has a 10 s limit and logs the HTTP code and curl exit.
- Header and privacy specs name the evidence on failure: every value and header name when a header count is wrong, and the
  DOM elements that name a third-party host.

## LP-1c — 2026-11-26
- Home pages TR/EN/DE: the approved landing design v13 (hero, both scroll stories, product cards, app tabs, security
  console and layers, install story, audiences, pricing, FAQ, contact), light theme, rendered per language at build time.
- Real app screenshots replace the nine drawn app screens (UI-close set, fictional Northline data), AVIF + WebP at 1x/2x.
- Intro on the home pages for visitors from outside the site only (skip button + Escape, inert page, reduced motion off).
- Copy matches the product (OI-279): 10 objects in the install scene, 7/30/90-day usage; health notes match the screen.
- Contact section shows a mail link until the form (LP-1b); the design's fonts self-hosted; legal shells and 404 restyled.
- New specs: intro, images, CSP through the interactions; content unit tests; header cases for JS and images.

## 0.1.0 — 2026-11-22 (LP-1a)
- Site skeleton: build script, placeholder TR/EN/DE pages, legal page shells, self-hosted fonts, security.txt.
- Worker serving static assets; `/api/demo` answers `503 not_ready`; security headers on every response.
- Test harness: check-dist, link check, HTML validation, vitest unit tests, Playwright (headers, privacy inventory,
  CSP, axe, i18n, no-JS, assets) in chromium, firefox and webkit.
- CI on GitHub-hosted runners; deploy workflow for preview (Access) and approved production.
