import type { IHttpRequestHelper } from "n8n-workflow";

const IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";
const APIKEY_GRANT = "urn:ibm:params:oauth:grant-type:apikey";

export function normalizeTokenSecret(raw: unknown): string {
  let t = String(raw ?? "").trim();
  if (/^bearer\s+/i.test(t)) {
    t = t.replace(/^bearer\s+/i, "").trim();
  }
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** IAM access tokens are JWTs (three dot-separated segments). IBM Cloud API keys are not. */
export function isLikelyIamAccessToken(secret: string): boolean {
  const parts = secret.trim().split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export async function exchangeApiKeyForIamAccessToken(
  httpRequest: IHttpRequestHelper["helpers"]["httpRequest"],
  apiKey: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: APIKEY_GRANT,
    apikey: apiKey.trim(),
  });

  const response = await httpRequest({
    method: "POST",
    url: IAM_TOKEN_URL,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = response as Record<string, unknown>;
  const access = data?.access_token;
  if (typeof access === "string" && access.length > 0) {
    return access.trim();
  }

  throw new Error(
    `IBM IAM token exchange returned no access_token. Check your API key. Response: ${JSON.stringify(response).slice(0, 400)}`,
  );
}
