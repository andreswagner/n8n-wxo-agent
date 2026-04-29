# n8n-nodes-watsonx-orchestrate

Custom n8n community node for executing IBM Watsonx Orchestrate agents from workflows with a deterministic output envelope.

## Features

- Secure credentials with n8n credential store (`token`, `baseUrl`, `environment`)
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
