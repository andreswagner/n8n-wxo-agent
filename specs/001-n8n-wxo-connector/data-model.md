## Data Model - n8n Watsonx Orchestrate Connector

## 1. ConnectorCredentials

**Purpose**: Securely store authentication and endpoint configuration for runtime execution.

**Fields**
- `token` (string, required, secret): Bearer token or API key used for authentication.
- `baseUrl` (string, required): Watsonx Orchestrate API base URL.
- `environment` (enum: `production` | `staging`, optional, default `production`): Context label for endpoint profiles.

**Validation Rules**
- `token` must be non-empty.
- `baseUrl` must be absolute HTTPS URL.
- Credential values must never be returned in node output or logs.

## 2. AgentReference

**Purpose**: Identify the target agent for execution.

**Fields**
- `mode` (enum: `list` | `manual`, required): Selection source.
- `agentId` (string, required): Resolved target agent identifier.
- `agentLabel` (string, optional): Human-readable display label for UI.

**Validation Rules**
- `agentId` required in both modes after resolution.
- If `mode=list`, stale selections must still allow manual fallback entry.

## 3. ExecutionInputPayload

**Purpose**: Canonical representation of workflow input before provider request mapping.

**Fields**
- `rawInput` (unknown, required): Incoming value from node parameter/expression.
- `inputType` (enum: `text` | `number` | `boolean` | `object` | `array` | `null`, derived): Normalized type marker.
- `normalizedInput` (object, required): Canonical payload used for request serialization.

**Validation Rules**
- Accept all JSON-compatible types plus string.
- Reject unsupported values (functions, symbols, circular structures) with `validation_error`.

## 4. ExecutionRequest

**Purpose**: Transport-ready call to Watsonx Orchestrate.

**Fields**
- `agentId` (string, required)
- `payload` (object, required): Provider-specific request body derived from `ExecutionInputPayload`.
- `timeoutMs` (integer, optional, default 30000): Per-call timeout.
- `requestId` (string, optional): Correlation value for observability.

**Validation Rules**
- `timeoutMs` range: 1000-120000.
- `payload` must be serializable JSON.

## 5. ExecutionResultItem

**Purpose**: Deterministic n8n output item produced per execution.

**Fields**
- `response` (string | object | array | null, required): Primary response content for downstream usage.
- `raw` (object | string | array | null, required): Unmodified provider payload.
- `metadata` (object, required):
  - `agentId` (string, required)
  - `status` (enum: `success` | `error`, required)
  - `durationMs` (integer, optional)
  - `requestId` (string, optional)

**Validation Rules**
- `metadata.status` must always exist.
- `agentId` in metadata must match `ExecutionRequest.agentId`.
- Shape remains stable for all successful executions.

## 6. ExecutionError

**Purpose**: Structured error payload for n8n-compatible failures.

**Fields**
- `errorCategory` (enum: `auth_error` | `agent_discovery_error` | `validation_error` | `execution_error` | `timeout_error` | `rate_limit_error`, required)
- `message` (string, required)
- `retryable` (boolean, required)
- `details` (object, optional): Sanitized provider/context detail.
- `metadata` (object, optional):
  - `agentId` (string, optional)
  - `status` (`error`)
  - `requestId` (string, optional)

**Validation Rules**
- Must never include credential secrets.
- Must always provide actionable category + human-readable message.

## 7. n8nErrorMapping

**Purpose**: Define canonical mapping from internal/provider failures to n8n error classes and taxonomy categories.

**Fields**
- `n8nErrorClass` (enum: `NodeApiError` | `NodeOperationError`, required)
- `errorCategory` (enum: `auth_error` | `agent_discovery_error` | `validation_error` | `execution_error` | `timeout_error` | `rate_limit_error`, required)
- `itemIndex` (integer, optional): Item index for multi-item execution context.
- `description` (string, optional): Human-readable troubleshooting context.

**Validation Rules**
- API/provider-originated failures MUST map to `NodeApiError`.
- Input/config/transformation failures MUST map to `NodeOperationError`.
- `itemIndex` MUST be set when thrown during per-item processing.

## 8. ItemExecutionOutcome

**Purpose**: Represent one item's result in multi-item runs, including continue-on-fail behavior.

**Fields**
- `mode` (enum: `success` | `error`, required)
- `itemIndex` (integer, required)
- `result` (`ExecutionResultItem`, optional when `mode=success`)
- `error` (`ExecutionError`, optional when `mode=error`)
- `pairedItem` (object, required when `mode=error` and continue-on-fail is enabled):
  - `item` (integer, required): Original input index reference.

**Validation Rules**
- If `continueOnFail=false`, first `mode=error` outcome terminates execution by throwing mapped n8n error.
- If `continueOnFail=true`, `mode=error` outcomes are emitted with `pairedItem` and execution continues for remaining items.
- Every output item must preserve deterministic shape for its mode (success envelope or structured error envelope).

## Relationships

- `ConnectorCredentials` are used to authorize every `ExecutionRequest`.
- `AgentReference` provides `agentId` for `ExecutionRequest`.
- `ExecutionInputPayload` maps into `ExecutionRequest.payload`.
- `ExecutionRequest` produces either `ExecutionResultItem` or `ExecutionError`.
- `n8nErrorMapping` governs how runtime failures are thrown or emitted.
- `ItemExecutionOutcome` wraps per-item success/error semantics for multi-item runs.
