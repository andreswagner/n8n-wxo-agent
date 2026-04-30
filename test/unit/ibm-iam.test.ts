import { describe, expect, it } from "vitest";
import { isLikelyIamAccessToken, normalizeTokenSecret } from "../../credentials/ibm-iam";

describe("ibm-iam", () => {
  it("normalizeTokenSecret strips Bearer and quotes", () => {
    expect(normalizeTokenSecret('Bearer abc')).toBe("abc");
    expect(normalizeTokenSecret('"xyz"')).toBe("xyz");
  });

  it("isLikelyIamAccessToken detects JWT-shaped strings", () => {
    expect(isLikelyIamAccessToken("a.b.c")).toBe(true);
    expect(isLikelyIamAccessToken("ibm-cloud-api-key-abc")).toBe(false);
    expect(isLikelyIamAccessToken("a.b")).toBe(false);
  });
});
