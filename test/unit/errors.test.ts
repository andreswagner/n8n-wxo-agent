import { describe, expect, it } from "vitest";
import { buildStructuredError, classifyProviderError, sanitizeDetails } from "../../nodes/WatsonxOrchestrate/errors";

describe("errors", () => {
  it("classifies auth, timeout and rate-limit", () => {
    expect(classifyProviderError({ statusCode: 401 })).toEqual({ category: "auth_error", retryable: false });
    expect(classifyProviderError({ statusCode: 429 })).toEqual({ category: "rate_limit_error", retryable: true });
    expect(classifyProviderError({ code: "ETIMEDOUT" })).toEqual({ category: "timeout_error", retryable: true });
  });

  it("sanitizes token-like values", () => {
    const sanitized = sanitizeDetails({
      message: "Bearer secret-token-123",
      token: "token=abcd1234",
    });

    expect(sanitized?.message).toContain("[REDACTED]");
    expect(String(sanitized?.token)).toContain("[REDACTED]");
  });

  it("builds structured envelope", () => {
    const error = buildStructuredError({
      category: "validation_error",
      message: "Bad input",
      retryable: false,
    });

    expect(error.metadata.status).toBe("error");
    expect(error.errorCategory).toBe("validation_error");
  });
});
