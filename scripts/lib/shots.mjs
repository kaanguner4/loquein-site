// The nine real app screens on the home page (UI-close landing set, fictional Northline data; decision C3).
// width/height = the screen's CSS size (aspect ratio for the <img> attributes); widths = files per format.
// sizes = the rendered width, so the browser picks 1x or 2x. Alt text: content key `shot.<id>` per language.
export const SHOTS = [
  {
    id: "chat",
    width: 1440,
    height: 1100,
    widths: [1200, 2400],
    sizes: "(max-width: 1280px) calc(100vw - 40px), 1216px",
  },
  {
    id: "approvals",
    width: 1440,
    height: 1100,
    widths: [1200, 2400],
    sizes: "(max-width: 1280px) calc(100vw - 40px), 1216px",
  },
  {
    id: "data-access",
    width: 1440,
    height: 1100,
    widths: [1200, 2400],
    sizes: "(max-width: 1280px) calc(100vw - 40px), 1216px",
  },
  {
    id: "health",
    width: 1440,
    height: 1100,
    widths: [1200, 2400],
    sizes: "(max-width: 1280px) calc(100vw - 40px), 1216px",
  },
  {
    id: "sign-in",
    width: 1440,
    height: 1100,
    widths: [1200, 2400],
    sizes: "(max-width: 1280px) calc(100vw - 40px), 1216px",
  },
  { id: "phone-chat", width: 390, height: 844, widths: [300, 600], sizes: "280px" },
  { id: "phone-history", width: 390, height: 844, widths: [300, 600], sizes: "280px" },
  { id: "phone-data-access", width: 390, height: 844, widths: [300, 600], sizes: "280px" },
  {
    id: "product-wide",
    width: 1680,
    height: 1100,
    widths: [840, 1680],
    sizes: "(max-width: 1080px) calc(100vw - 40px), 820px",
  },
];
