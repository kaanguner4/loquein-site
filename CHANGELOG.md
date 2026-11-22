# Changelog

## 0.1.0 — 2026-11-22 (LP-1a)
- Site skeleton: build script, placeholder TR/EN/DE pages, legal page shells, self-hosted fonts, security.txt.
- Worker serving static assets; `/api/demo` answers `503 not_ready`; security headers on every response.
- Test harness: check-dist, link check, HTML validation, vitest unit tests, Playwright (headers, privacy inventory,
  CSP, axe, i18n, no-JS, assets) in chromium, firefox and webkit.
- CI on GitHub-hosted runners; deploy workflow for preview (Access) and approved production.
