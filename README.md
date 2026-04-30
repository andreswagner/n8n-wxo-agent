# n8n-nodes-watsonx-orchestrate

Custom n8n community node for executing IBM Watsonx Orchestrate agents from workflows with a deterministic output envelope.

**Requirements:** n8n **2.x** (self-hosted or Cloud where community nodes are supported). Not compatible with n8n 1.x.

## Features

- Secure credentials with n8n credential store (`token`, `baseUrl`, `environment`; API key or IAM access token)
- Agent execution with list/manual selection modes
- Deterministic output envelope: `response`, `raw`, `metadata`
- Structured error taxonomy with continue-on-fail support
- Output shaping mode (`full` or `concise`)

## Output Contract

Successful execution returns:

- `response`: normalized main response payload
- `raw`: original provider payload (or `null` when output mode is `concise`)
- `metadata`: includes `agentId`, `status`, `durationMs`, and `requestId`

Failed items with continue-on-fail enabled return:

- `errorCategory`: `auth_error | agent_discovery_error | validation_error | execution_error | timeout_error | rate_limit_error`
- `message`, `retryable`, `details`, `metadata`
- `pairedItem` linking output item to the source item index

## Authentication (IBM Cloud)

watsonx Orchestrate on **IBM Cloud** can be authorized with an **IAM API key** or an **IAM access token** (see IBM: *Generating the access token for the IBM Cloud offering*). The credential’s **Token** field accepts either: if you paste an **API key**, n8n exchanges it for an IAM access token before requests; if you paste a **JWT** (`access_token`), it is sent as `Authorization: Bearer …` directly.

- **Manual token (optional):** you can still paste only the **`access_token`** from IAM. Obtain it by exchanging your API key:

```bash
curl -X POST 'https://iam.cloud.ibm.com/identity/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=YOUR_APIKEY'
```

Copy `access_token` from the JSON into the credential **Token** field (no `Bearer ` prefix). Refresh when the token expires.

- **`npm run test:live`** uses `.env` **`WXO_API_KEY`** and performs this exchange automatically before calling the Orchestrate API (see `test/live/ibm-iam-exchange.ts`).

## Quick Usage

1. Configure `Watsonx Orchestrate API` credentials.
2. Add the `Watsonx Orchestrate` node to your workflow.
3. Select `Execute Agent`, choose list/manual agent targeting, provide input.
4. Execute and consume `response` + `metadata` downstream.

## Development

- Install: `npm install`
- Build: `npm run build`
- Test: `npm run test`
- Package check: `npm pack --dry-run`

### Live API verification (real credentials)

Use this when n8n shows **“Couldn’t connect with these settings”** and you want to hit the same endpoint as the credential test, outside n8n.

1. Copy `.env.example` to `.env` (`.env` is gitignored).
2. Set **`WXO_BASE_URL`** (Orchestrate API host) and **`WXO_API_KEY`** (IBM Cloud API key). Nothing else is required in `.env`.
3. Run **`npm run test:live`**.

The script exchanges the API key at IBM IAM, then calls `GET {WXO_BASE_URL}{WXO_LIVE_PATH}` (default **`WXO_LIVE_PATH=/v1/orchestrate/agents`**) with `Authorization: Bearer <access_token>`, matching the credential **Test** and the same routes as [`@andreswagner/node-red-contrib-wxo-agent`](https://www.npmjs.com/package/@andreswagner/node-red-contrib-wxo-agent). **`WXO_BASE_URL`** must be the **Service instance URL** (`https://<host>/instances/<tenant_id>`). **`npm test`** does not use `.env` for network calls (live tests are excluded).

For **n8n**, put the IAM **`access_token`** from the curl exchange (or equivalent) into the **Token** field unless you rely on another documented Bearer format. This package does not run the IAM exchange inside n8n yet; `npm run test:live` does it only for local CLI checks.
