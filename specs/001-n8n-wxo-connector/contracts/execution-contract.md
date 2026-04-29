## Execution Contract - n8n Watsonx Orchestrate Connector

This document defines the runtime contract between node execution logic and Watsonx Orchestrate transport/mapping layers.

## Request Contract

### Execute Agent Request (internal canonical shape)

```json
{
  "agentId": "string",
  "payload": {},
  "timeoutMs": 30000,
  "requestId": "optional-string"
}
```

**Rules**
- `agentId` is required and non-empty.
- `payload` must be JSON-serializable.
- `timeoutMs` defaults to `30000` when omitted.

## Success Contract

### Normalized Output Item

```json
{
  "response": "...",
  "raw": {},
  "metadata": {
    "agentId": "string",
    "status": "success",
    "durationMs": 1234,
    "requestId": "optional-string"
  }
}
```

**Rules**
- `metadata.status` MUST be `success`.
- `response`, `raw`, and `metadata` MUST always exist.
- `raw` preserves provider response with minimal transformation.

## Error Contract

### Structured Error Payload

```json
{
  "errorCategory": "validation_error",
  "message": "Input payload is not valid JSON-serializable data",
  "retryable": false,
  "details": {},
  "metadata": {
    "agentId": "optional-string",
    "status": "error",
    "requestId": "optional-string"
  }
}
```

**Allowed `errorCategory` values**
- `auth_error`
- `agent_discovery_error`
- `validation_error`
- `execution_error`
- `timeout_error`
- `rate_limit_error`

**Rules**
- Every failure must map to one allowed category.
- Error payload must be sanitized (no credentials/secrets).
- `retryable=true` only for transient conditions (timeouts, rate limits, some upstream failures).

### n8n Error Class Mapping

- Use `NodeApiError` for provider/API-originated failures:
  - authentication/authorization failures
  - service availability failures
  - provider execution failures
  - timeout and rate-limit failures
- Use `NodeOperationError` for node-local failures:
  - invalid or malformed user input
  - configuration or parameter issues
  - request/response transformation failures
- Include `itemIndex` when throwing per-item errors in multi-item processing.

## continueOnFail Contract

### Behavior Rules

- When `continueOnFail=false`:
  - throw mapped n8n error (`NodeApiError` or `NodeOperationError`) immediately for the first failing item.
- When `continueOnFail=true`:
  - continue processing remaining items.
  - emit per-item error outputs that include:
    - structured error payload (contract above)
    - `pairedItem: { "item": <inputIndex> }` linking output back to source item.

### Error Output Example (`continueOnFail=true`)

```json
{
  "errorCategory": "validation_error",
  "message": "Input payload is not valid JSON-serializable data",
  "retryable": false,
  "metadata": {
    "status": "error",
    "agentId": "optional-string",
    "requestId": "optional-string"
  },
  "pairedItem": {
    "item": 0
  }
}
```

## Mapping Guidance

- Primitive input values map to provider payload via canonical wrapper before transport.
- Object/array inputs are passed as structured payload body with deterministic key naming.
- Non-JSON upstream responses are coerced into usable `response` while preserving original in `raw`.
