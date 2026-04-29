## Research Decisions - n8n Watsonx Orchestrate Connector

### 1) Authentication model for Watsonx Orchestrate

- **Decision**: Use credential-based bearer token/API key input in n8n credentials and inject `Authorization: Bearer <token>` at request time through a transport helper.
- **Rationale**: Aligns with n8n secret storage and avoids exposing sensitive values in node parameters or workflow JSON.
- **Alternatives considered**:
  - OAuth2 client flow in v1 (rejected: adds setup complexity and token refresh lifecycle not required for initial scope).
  - Inline token as node parameter (rejected: violates constitution security principle).

### 2) Agent resolution UX (dropdown + manual override)

- **Decision**: Support two modes: dynamic options list (`listAgents`) when available and manual `agentId` entry fallback always available.
- **Rationale**: Meets functional requirement for flexibility and keeps workflows resilient when discovery endpoint is unavailable/slow.
- **Alternatives considered**:
  - Discovery-only selection (rejected: blocks users if discovery fails).
  - Manual ID only (rejected: poorer UX and discoverability).

### 3) Input normalization strategy

- **Decision**: Implement deterministic mapper that accepts primitive values and JSON objects/arrays, then converts to a provider request envelope with explicit `inputType` metadata.
- **Rationale**: Supports varied n8n upstream payloads while preserving transparent transformation behavior.
- **Alternatives considered**:
  - Pass-through raw JSON only (rejected: excludes common primitive inputs).
  - Multiple separate node operations for each payload type (rejected: unnecessary complexity for v1).

### 4) Output contract and non-JSON provider responses

- **Decision**: Normalize all successful responses into `{ response, raw, metadata }` and coerce non-JSON content into a usable string in `response` while preserving original payload in `raw`.
- **Rationale**: Gives downstream nodes a stable shape while retaining full upstream traceability.
- **Alternatives considered**:
  - Return provider response untouched (rejected: unstable downstream contract).
  - Drop raw payload (rejected: weaker debugging and auditability).

### 5) Error taxonomy and retry posture

- **Decision**: Use n8n-native error classes and a mapped taxonomy:
  - `NodeApiError` for provider/API failures (auth, rate limit, timeout, upstream execution faults)
  - `NodeOperationError` for validation/configuration/transformation faults
  - map both classes into stable categories: `auth_error`, `agent_discovery_error`, `validation_error`, `execution_error`, `timeout_error`, `rate_limit_error`
- **Rationale**: Preserves n8n idioms for user-visible failures while keeping a deterministic category contract for downstream handling.
- **Alternatives considered**:
  - Generic single error type (rejected: not actionable enough).
  - Automatic aggressive retries always on (rejected: may duplicate side effects and hide failures).

### 6) Multi-item execution and continue-on-fail behavior

- **Decision**: Implement per-item execution loops that honor `this.continueOnFail()`:
  - when disabled: throw typed n8n errors immediately with `itemIndex`
  - when enabled: emit item-scoped error payloads with `pairedItem` and continue processing remaining items
- **Rationale**: Aligns connector behavior with n8n workflow expectations and prevents one bad item from invalidating a full batch when the workflow opts into resilience.
- **Alternatives considered**:
  - fail-fast only for all runs (rejected: incompatible with common n8n fault-tolerant patterns).
  - swallow errors and return partial data without explicit error records (rejected: poor observability).

### 7) Testing strategy and tooling

- **Decision**: Use Vitest for fast unit tests and integration tests with mocked HTTP for deterministic CI behavior; perform manual validation in a local n8n instance for contract realism.
- **Rationale**: Balances speed, reliability, and confidence in n8n runtime behavior.
- **Alternatives considered**:
  - End-to-end tests only (rejected: slower and flaky without dedicated test environment).
  - Unit tests only (rejected: insufficient coverage of n8n execution wiring).

### 8) Packaging and release hygiene

- **Decision**: Validate distributable contents via `npm pack --dry-run` and ensure README includes setup, credentials, example workflow, and limitations.
- **Rationale**: Prevents accidental publication of internal/sensitive files and improves first-run usability.
- **Alternatives considered**:
  - Ad hoc manual verification (rejected: error-prone).
