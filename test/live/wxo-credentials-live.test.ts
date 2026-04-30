/**
 * Optional live check: GET {baseUrl}{path} with Bearer IAM access token (from API key exchange).
 *
 * Setup: `.env` with WXO_BASE_URL and WXO_API_KEY (see `.env.example`).
 * Run: npm run test:live
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { fetchIamAccessTokenFromApiKey } from "./ibm-iam-exchange";
import { normalizeBearerToken } from "./token-util";

// Load `.env` from project root: prefer cwd (npm run from repo), else path relative to this file.
const liveTestDir = dirname(fileURLToPath(import.meta.url));
const envFile = [resolve(process.cwd(), ".env"), resolve(liveTestDir, "../../.env")].find((p) =>
  existsSync(p),
);
if (envFile) {
  const result = config({ path: envFile });
  if (result.error) {
    console.warn(`[test:live] dotenv could not read ${envFile}:`, result.error.message);
  }
} else {
  config();
}

function joinBaseUrlAndPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

const baseUrl = process.env.WXO_BASE_URL?.trim();
const apiKey = normalizeBearerToken(process.env.WXO_API_KEY ?? "");
/** Same default as n8n credential test; override if your tenant uses another route (must start with `/`). */
const rawLivePath = process.env.WXO_LIVE_PATH?.trim();
const livePath =
  rawLivePath && rawLivePath.length > 0
    ? rawLivePath.startsWith("/")
      ? rawLivePath
      : `/${rawLivePath}`
    : "/v1/orchestrate/agents";

const liveConfigured = Boolean(baseUrl && apiKey);

describe.skipIf(!liveConfigured)("Watsonx Orchestrate API — live credential check", () => {
  let bearerToken: string;

  beforeAll(async () => {
    const tokenUrl = process.env.WXO_IAM_TOKEN_URL?.trim() || undefined;
    bearerToken = await fetchIamAccessTokenFromApiKey(apiKey, tokenUrl);
  });

  it("GET live path succeeds (IBM IAM exchange + Orchestrate request)", async () => {
    const url = joinBaseUrlAndPath(baseUrl!, livePath);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
    });

    const bodyText = await response.text();
    const hint =
      response.status === 401
        ? " — 401: token rejected. If IAM exchange succeeded, check Base URL + path for your instance "
          + `(default path is /v1/agents; set WXO_LIVE_PATH if your API uses another route, e.g. under /instances/...).`
        : "";
    expect(
      response.status,
      (bodyText.slice(0, 500) || response.statusText) + hint,
    ).toBe(200);

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error(
        `Expected JSON body from ${url}, got non-JSON (status ${response.status}): ${bodyText.slice(0, 200)}`,
      );
    }
    // List agents returns a JSON array per wxo OpenAPI; legacy shape used `{ agents: [...] }`.
    if (Array.isArray(parsed)) {
      expect(parsed.every((x) => typeof x === "object" && x !== null)).toBe(true);
    } else if (parsed !== null && typeof parsed === "object") {
      const agents = (parsed as { agents?: unknown }).agents;
      if (agents !== undefined) {
        expect(Array.isArray(agents)).toBe(true);
      }
    } else {
      throw new Error(`Unexpected list-agents JSON shape: ${String(parsed).slice(0, 100)}`);
    }
  });
});
