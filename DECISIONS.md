# Decisions

Newest first. Package LP plans live outside this repo (brief + Step 0); this file keeps the decisions the code relies on.

## 2026-11-26 — LP-1e (English first, contact, sign-in)
- Decided by Kaan 26 Nov 03:48. English is the first language (the 23 Nov decision, now applied to the paths): `/`, `/privacy-notice/`, `/privacy/`, `/cookies/`; Turkish under `/tr/` (`/tr/`, `/tr/kvkk-aydinlatma-metni/`, `/tr/gizlilik/`, `/tr/cerez-politikasi/`); German stays under `/de/`. `LANGS` is `en, tr, de` (language switch, hreflang, sitemap), hreflang x-default is `/`. No redirect by browser language and no storage: the language switch stays the only way. The site is `noindex` and not live, so the old `/en/` and Turkish-at-root URLs get no redirects.
- Contact: the contact section uses `hello@loquein.com` (Cloudflare Email Routing forwards it; this replaces the Outlook address there). `/.well-known/security.txt` Contact is `mailto:security@loquein.com` (k8, earlier than "until MV"). The legal pages keep `guner.kaan@outlook.com` as the data controller's address (their texts are not part of this row).
- Wording: heading `ct.mailH` "Bize ulaşın" / "Contact us" / "Kontakt", button `ct.mailBtn` "E-posta gönderin" / "Send an email" / "E-Mail senden". `ct.sub` and `ct.mailP` do not mention a form while there is none; they tell people to email us.
- Sign-in link (reverses the LP-1c omission): header on every page and language, same tab, label "Sign in" / "Giriş yap" / "Anmelden". Its target is the one build setting `APP_URL`: default `https://app.loquein.com`; the preview deploy job builds with `APP_URL=http://localhost:5173` (Kaan's local app for the demo). The build refuses any other value; `check-dist` allows exactly these two targets (a production build only the app), requires exactly one `a.signin` per page and no `target` attribute; `tests/e2e/signin.spec.ts` runs locally and in both deploy jobs against the live host.
- The 404 page is English first (English heading, Turkish and German lines, three home links); it has no header sign-in link.

## 2026-11-26 — LP-1c (design)
- Source of the page: the approved v13 build (`landing-demo-build-2026-11-23c`: `template-app.html` plus the strings and scene data embedded in its built page), ported once into `site/templates/home.html`, `site/assets/css/landing.css`, `site/assets/js/home.js` and `site/content/<lang>/home*.json`, which are the source from now on. The build's own scripts were read, never run.
- Each language is rendered at build time (no client-side language switch, no `?lang=`); the home script ships per language (`home-<lang>.<hash>.js`) with that language's strings and scene data; the build wrapper adds `"use strict"` (Biome treats `.js` as a module and removes it from the source) and strips indentation and whole-line comments (JS/CSS budgets of step0 h).
- CSP: the design's 33 `style=""` attributes became generated classes (tripled selector, so they still win like inline styles), SVG `style="opacity:0"` became the `opacity` attribute, the console role colour a class, CSS `data:` SVGs files under `assets/img/ui/` (hashed by the build, which now refuses `data:` URLs in CSS).
- `assets/js/js-on.js` (one line, blocking in `<head>`) sets `html.js`; reveal, hero and tab states hide content only under `.js`, so the page reads without JavaScript (all six app screens stack).
- `innerHTML` stays for the scene SVG built from our own constants and data files (no user input); Trusted Types stays off until LP-1b tests Turnstile with it (step0 d).
- Screenshots (decision C3): the nine UI-close landing screens x TR/EN/DE as AVIF + WebP at 1x/2x by `scripts/images.mjs`, using the sharp that wrangler already installs (pinned by the lockfile, no new dependency); outputs committed (4.3 MB), CI never needs the PNGs. Hero, bento and security illustrations stay drawn. The numbered markers were re-placed in percent on the real shots.
- Copy (OI-279 and the real shots): the install scene counts 10 objects (`in.tables` objects / nesne / Objekte); the health note names 7, 30 or 90 days; the drawn "42 tables" and "last 14 days" left with the drawn screens; `app.n30p`/`app.n31p` describe what the health screen shows; `app.pre` says real screenshots with fictional sample data; the swipe hint is gone. TR/DE slogans stay as built (placeholders, Kaan 23 Nov).
- Contact until LP-1b: the form section is a `mailto:guner.kaan@outlook.com` card (the published contact); no form and no request leaves the page.
- The design's "Sign in" link to app.loquein.com is left out until MV moves the app there (the host does not exist; external links are allowlisted).
- Accessibility (axe WCAG 2.2 AA, all home variants): `--soft` #8A87A0 -> #6B6880 (step0 h muted-2), inactive story steps #A19DB3 -> #6B6880, language switch on `--muted`, product heading accent #E8601A, ledger mint #0F9A70. The language switch shows TR/EN/DE and names each language for screen readers; the intro is a labelled region, the page behind it inert, focus on the skip button.
- Fonts: the design's static faces (Bricolage Grotesque 600/700/800, Instrument Serif 400 + italic, Schibsted Grotesk 400/500/600, IBM Plex Mono 400/500, Space Grotesk 700 for the wordmark), Latin + Latin Extended, byte-identical to the approved build; OFL copyright lines read from each font's name table. Inter and JetBrains Mono removed.
- Biome: `landing.css` and `home.js` keep the design's cascade order and ES5 style, so six style rules are off for these two files only (`biome.json` overrides); dead helpers were removed instead of silenced.
- Specs open pages with a same-origin referrer by default (`tests/e2e/fixtures.ts`), so the intro does not cover pages under test; `intro.spec.ts` and the privacy spec's external visits cover arriving from outside.
- The `data-placeholder` marker now sits only on the legal shells: `check:prod` keeps refusing production until their texts land.

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
