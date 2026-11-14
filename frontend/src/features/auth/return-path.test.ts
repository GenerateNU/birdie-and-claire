import { describe, expect, test } from "bun:test";

import { toSafeReturnPath } from "@/features/auth/return-path";

const origin = "https://birdieandclaire.com";

describe("toSafeReturnPath", () => {
  test("keeps a path on the site, with its query and hash", () => {
    expect(toSafeReturnPath("/o/abc", origin)).toBe("/o/abc");
    expect(toSafeReturnPath("/o/abc?x=1#top", origin)).toBe("/o/abc?x=1#top");
  });

  test("rejects anything that leaves the site", () => {
    const offsite = [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/.//evil.com",
      "/a/..//evil.com",
      "/%2e//evil.com",
      `${origin}//evil.com`,
      "javascript:alert(1)",
      "http://[",
    ];

    for (const raw of offsite) {
      expect(toSafeReturnPath(raw, origin)).toBeNull();
    }
  });
});
