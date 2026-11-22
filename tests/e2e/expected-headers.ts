// The header set from step0 d, written out independently of site/static/_headers and worker/headers.ts.

export const COMMON: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow",
};

const csp = (script: string, frame: string) =>
  [
    "default-src 'none'",
    `script-src ${script}`,
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${frame}`,
    "manifest-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

export const CSP = {
  home: csp("'self' https://challenges.cloudflare.com", "https://challenges.cloudflare.com"),
  page: csp("'self'", "'none'"),
  api: "default-src 'none'; frame-ancestors 'none'",
};

export const CACHE = {
  revalidate: "public, max-age=0, must-revalidate",
  immutable: "public, max-age=31536000, immutable",
  api: "no-store",
};

// Headers that must never appear on any response (same-origin only, no cookies).
export const FORBIDDEN = [
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
];
