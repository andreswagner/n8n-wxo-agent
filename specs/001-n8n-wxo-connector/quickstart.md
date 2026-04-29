## Quickstart - n8n Watsonx Orchestrate Connector

## Prerequisites

- Node.js 20+
- npm 10+
- n8n local instance or dev container
- Watsonx Orchestrate access token/API key and base URL

## 1) Install dependencies

```bash
npm install
```

## 2) Build the node package

```bash
npm run build
```

## 3) Link into local n8n for manual validation

```bash
npm link
# In n8n environment:
npm link n8n-nodes-watsonx-orchestrate
```

Restart n8n and confirm the connector appears in the node picker.

## 4) Configure credentials in n8n

- Create new credential entry for Watsonx Orchestrate.
- Set `token` and `baseUrl`.
- Save credentials (do not place secrets in regular node fields).

## 5) Configure and execute workflow

- Add the connector node after a source node (for example `Set` or `Webhook`).
- Choose agent mode:
  - List discovery (if available), or
  - Manual `agentId`.
- Provide input via static JSON/text or n8n expression.
- Execute workflow and verify output fields:
  - `response`
  - `raw`
  - `metadata.agentId`
  - `metadata.status`

## 6) Run test suite

```bash
npm run test
```

## 7) Run package hygiene check

```bash
npm pack --dry-run
```

Confirm no sensitive/internal files are included in package artifacts.

## Common Failure Checks

- `auth_error`: verify credential token and base URL.
- `agent_discovery_error`: switch to manual `agentId` mode.
- `validation_error`: verify input expression resolves to serializable data.
- `timeout_error`: increase timeout setting and retry.
