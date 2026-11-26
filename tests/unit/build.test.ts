// The one build setting, APP_URL: the header sign-in target. Only the production app and the local app are valid.
import { describe, expect, it } from "vitest";
import { appUrl } from "../../scripts/build.mjs";

describe("APP_URL", () => {
  it("defaults to the production app", () => {
    expect(appUrl({})).toBe("https://app.loquein.com");
    expect(appUrl({ APP_URL: "" })).toBe("https://app.loquein.com");
  });

  it("accepts the local app for the preview build", () => {
    expect(appUrl({ APP_URL: "http://localhost:5173" })).toBe("http://localhost:5173");
  });

  for (const bad of [
    "https://app.example.org",
    "http://localhost:5173/",
    "https://app.loquein.com/x",
    "javascript:alert(1)",
  ]) {
    it(`refuses ${bad}`, () => {
      expect(() => appUrl({ APP_URL: bad })).toThrow(/APP_URL must be/);
    });
  }
});
