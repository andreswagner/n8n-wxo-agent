# Implementation Plan: n8n Watsonx Orchestrate Connector Node

**Branch**: `001-n8n-wxo-connector` | **Date**: 2026-04-29 | **Spec**: `specs/001-n8n-wxo-connector/spec.md`  
**Input**: Feature specification from `specs/001-n8n-wxo-connector/spec.md`

## Summary

Build a production-ready custom n8n connector node that authenticates against IBM Watsonx Orchestrate, supports agent selection (discovery and manual ID), executes synchronous agent calls from workflow input, and returns deterministic structured outputs plus actionable error taxonomy. The implementation uses an n8n-native split (credentials + node + API client + mappers), with strict input normalization, output contracts, and test coverage for happy-path and failure-path behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS  
**Primary Dependencies**: `n8n-workflow`, `n8n-core`, `@n8n/node-cli`/n8n node tooling, built-in `this.helpers.httpRequestWithAuthentication` for transport  
**Storage**: N/A (stateless runtime; secrets only in n8n credential store)  
**Testing**: Vitest (unit), n8n execution harness + mocked HTTP for integration  
**Target Platform**: n8n self-hosted and n8n-compatible runtime on Linux/macOS containers  
**Project Type**: n8n community node package/library  
**Performance Goals**: Connector overhead <150ms p95 excluding upstream latency; successful parse/normalize for 100% valid responses  
**Constraints**: No secret leakage to logs/output, deterministic output envelope, synchronous execution only, timeout configurable per node execution, avoid runtime dependencies for verification readiness  
**Scale/Scope**: Initial release ships one credential type, one node operation (`executeAgent`), supports single and multi-item n8n runs

## Technical Constraints and Integration Gotchas

1. **n8n Credentials Boundary**: Secrets must live only in credential classes and be read via n8n credential helpers during execution; never expose token values as regular node parameters.
2. **Endpoint Path Verification**: Confirm exact Watsonx Orchestrate path contracts from real, working API examples before coding request builders to avoid near-match endpoint regressions.
3. **Base URL Handling**: Preserve instance path segments when constructing endpoint URLs (avoid join logic that drops nested base paths).
4. **Dynamic Agent Discovery Resilience**: Agent list loading failures must not block execution; manual `agentId` input remains available as a first-class fallback.
5. **Output Contract Stability**: The `response`/`raw`/`metadata` envelope must remain deterministic across equivalent outcomes to protect downstream workflow compatibility.

## n8n Community Node Best Practices to Apply

1. **Use n8n Error Primitives**: Wrap provider/API failures with `NodeApiError` and validation/configuration problems with `NodeOperationError`, including `itemIndex` for item-level clarity.
2. **Honor `continueOnFail()`**: For multi-item processing, emit per-item error output with `pairedItem` when continue-on-fail is enabled instead of terminating the whole node run.
3. **Credential Quality**: Add both `authenticate` and `test` blocks in credential definitions plus `documentationUrl` so credential issues are caught early in UI.
4. **Prefer n8n Request Helpers**: Use `httpRequestWithAuthentication` and n8n request defaults instead of custom HTTP client stacks, reducing boilerplate and improving consistency.
5. **Versioning Strategy**: Start with light versioning support (`version: [1]`) and evolve with additive versions to avoid breaking existing workflows.
6. **Community Packaging Standards**: Ensure package name follows `n8n-nodes-*`, include `n8n-community-node-package` keyword, and register nodes/credentials in `package.json` under `n8n`.
7. **Verification Readiness**: Keep runtime dependency footprint minimal (ideally none) and prepare release pipeline for GitHub Actions npm publish provenance (required for verified submissions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. n8n-Native Design**: PASS - design uses standard n8n credential class, node properties, and item-based `execute()` flow.
- **II. Minimal Configuration and Robust Inputs**: PASS - required fields limited to credentials, agent reference, input payload, optional timeout/retry controls with safe defaults.
- **III. Transparent Execution and Stable Output Contracts**: PASS - explicit input mapper and output normalizer with documented envelope (`response`, `raw`, `metadata`).
- **IV. Extensible-by-Default Architecture**: PASS - API client abstraction and mapper modules leave extension points for streaming/multi-turn later.
- **V. Reliability, Error Taxonomy, and Observable Failures**: PASS - standardized error classes and user-actionable categories (`auth_error`, `agent_discovery_error`, `execution_error`, `validation_error`, plus timeout/rate-limit specializations).
- **Release and Distribution Hygiene**: PASS - includes packaging validation (`npm pack --dry-run`) and README completeness gate.

Post-design re-check: PASS (no constitutional violations introduced by data model or contract decisions).

## Project Structure

### Documentation (this feature)

```text
specs/001-n8n-wxo-connector/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── execution-contract.md
└── tasks.md               # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
credentials/
└── WatsonxOrchestrateApi.credentials.ts

nodes/
└── WatsonxOrchestrate/
    ├── WatsonxOrchestrate.node.ts
    ├── transport.ts
    ├── mappers.ts
    ├── errors.ts
    └── descriptions.ts

test/
├── unit/
│   ├── mappers.test.ts
│   └── errors.test.ts
├── integration/
│   └── node-execute.test.ts
└── fixtures/
    └── provider-responses.json
```

**Structure Decision**: Single-package n8n community node layout with domain-local modules under `nodes/WatsonxOrchestrate/` to keep execution logic cohesive while preserving extension boundaries.

## Phase Plan

### Phase 0 - Research

- Confirm Watsonx Orchestrate authentication and execution endpoint patterns.
- Confirm n8n dynamic options loading behavior and fallback strategy for agent selector.
- Confirm timeout and retry handling strategy aligned with n8n execution semantics.
- Confirm packaging/release requirements for community node distribution.

### Phase 1 - Design and Contracts

- Finalize data model for credentials, agent reference, payload variants, normalized success output, and normalized error output.
- Define execution contract and error taxonomy contract in `contracts/execution-contract.md`.
- Write `quickstart.md` for local setup, linking, credentials setup, test run, and manual validation workflow.

### Phase 2 - Task Planning Handoff

- Convert this plan into dependency-ordered implementation tasks using `/speckit-tasks`.

## Key Design Decisions

1. **Agent Selection Model**: Provide both discovery dropdown and manual `agentId` entry, with manual mode always available.
2. **Input Flexibility**: Accept primitive and structured JSON payloads; detect and normalize input type automatically.
3. **Transport Abstraction**: Isolate authentication, timeout, retry, and HTTP concerns in `transport.ts` to keep node execution logic thin.
4. **Error Taxonomy Enforcement**: Map every failure to a fixed category set so users get actionable, consistent diagnostics.
5. **Documentation-as-Contract**: Keep `contracts/execution-contract.md`, `quickstart.md`, and README aligned to prevent drift between implementation and user guidance.
6. **Release Hygiene Gate**: Require `npm pack --dry-run` verification before release candidates.

## Testing Strategy

1. **Contract-First Integration Checks**: Validate real request/response shapes early against provider behavior, then codify with deterministic mocked integration tests.
2. **Failure Classification Coverage**: Add explicit tests for invalid credentials, unknown agent, malformed input, timeout, and rate-limit scenarios.
3. **Input Normalization Matrix**: Test strings, numbers, booleans, objects, arrays, and null inputs across single-item and multi-item n8n execution.
4. **Secret-Safety Tests**: Assert logs and output payloads never include credential values on success or failure.
5. **Packaging Verification**: Validate publish contents with `npm pack --dry-run` and confirm only intended runtime assets are included.

## Complexity Tracking

No constitutional violations or complexity exemptions are required at planning time.
