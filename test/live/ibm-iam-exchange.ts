/**
 * IBM Cloud: exchange IAM API key for IAM access token (`access_token` in JSON).
 * Same contract as IBM docs “Generating the access token for the IBM Cloud offering”:
 * POST https://iam.cloud.ibm.com/identity/token
 *   -H 'Content-Type: application/x-www-form-urlencoded'
 *   -d 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=MY_APIKEY'
 */
const DEFAULT_IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";

export async function fetchIamAccessTokenFromApiKey(
  apiKey: string,
  tokenUrl: string = DEFAULT_IAM_TOKEN_URL,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey.trim(),
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`IAM token exchange failed HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("IAM token response missing access_token");
  }
  return String(json.access_token).trim();
}
