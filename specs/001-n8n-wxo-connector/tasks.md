# Tasks: n8n Watsonx Orchestrate Connector Node

**Input**: Design documents from `/specs/001-n8n-wxo-connector/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/execution-contract.md`, `quickstart.md`

**Tests**: Included because the feature specification and plan explicitly require coverage for happy-path and failure-path behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize package/tooling and baseline project layout for an n8n community node.

- [X] T001 Create baseline source and test directories in `credentials/`, `nodes/WatsonxOrchestrate/`, `test/unit/`, `test/integration/`, and `test/fixtures/`
- [X] T002 Initialize/update package metadata, scripts, and n8n node registration in `package.json`
- [X] T003 Configure TypeScript build and path behavior for node sources in `tsconfig.json`
- [X] T004 [P] Configure Vitest for unit and integration test execution in `vitest.config.ts`
- [X] T005 [P] Add fixture scaffolding for provider response permutations in `test/fixtures/provider-responses.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared primitives required by all stories.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T006 Implement credential schema, auth injection, and credential test endpoint in `credentials/WatsonxOrchestrateApi.credentials.ts`
- [X] T007 [P] Implement canonical error taxonomy and n8n error mapping helpers in `nodes/WatsonxOrchestrate/errors.ts`
- [X] T008 [P] Implement payload normalization and response shaping primitives in `nodes/WatsonxOrchestrate/mappers.ts`
- [X] T009 Implement transport client using `httpRequestWithAuthentication` with timeout/retry hooks in `nodes/WatsonxOrchestrate/transport.ts`
- [X] T010 [P] Define shared node parameter descriptions and field guidance text in `nodes/WatsonxOrchestrate/descriptions.ts`
- [X] T011 Implement base node scaffold, operation routing, and item-loop execution skeleton in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`

**Checkpoint**: Foundation ready; user stories can now be implemented independently.

---

## Phase 3: User Story 1 - Execute an external agent in a workflow (Priority: P1) 🎯 MVP

**Goal**: Execute a selected agent from workflow input and return deterministic structured outputs for downstream nodes.

**Independent Test**: Run a workflow with valid credentials + valid agent + sample input and verify output contains `response`, `raw`, and `metadata`.

### Tests for User Story 1

- [X] T012 [P] [US1] Add unit tests for input normalization matrix in `test/unit/mappers.test.ts`
- [X] T013 [P] [US1] Add integration test for successful single-item execution in `test/integration/node-execute.test.ts`
- [X] T014 [P] [US1] Add integration test for successful multi-item execution in `test/integration/node-execute.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Implement canonical request builder from normalized payload to execution request contract in `nodes/WatsonxOrchestrate/mappers.ts`
- [X] T016 [US1] Implement execute-agent transport call and success-response normalization in `nodes/WatsonxOrchestrate/transport.ts`
- [X] T017 [US1] Implement node `executeAgent` operation for per-item processing and success output emission in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`
- [X] T018 [US1] Implement deterministic metadata population (`agentId`, `status`, `durationMs`, `requestId`) in `nodes/WatsonxOrchestrate/mappers.ts`
- [X] T019 [US1] Add operation and output documentation for success envelope in `README.md`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Configure access securely and clearly (Priority: P2)

**Goal**: Support reusable secure credentials and clear authentication behavior without exposing secrets.

**Independent Test**: Save credentials once, execute multiple runs successfully, and verify invalid credentials return explicit auth failures with no secret leakage.

### Tests for User Story 2

- [X] T020 [P] [US2] Add unit tests for auth error classification and sanitization in `test/unit/errors.test.ts`
- [X] T021 [P] [US2] Add integration test for invalid/expired credentials failure path in `test/integration/node-execute.test.ts`
- [X] T022 [P] [US2] Add integration assertion that outputs/log payloads omit credential secrets in `test/integration/node-execute.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Implement credential validation and sanitized auth failure mapping in `nodes/WatsonxOrchestrate/errors.ts`
- [X] T024 [US2] Wire credential-test behavior and documentation URL details in `credentials/WatsonxOrchestrateApi.credentials.ts`
- [X] T025 [US2] Enforce secret-safe error/details shaping before node output emission in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`
- [X] T026 [US2] Add concise credentials and security guidance to node field descriptions in `nodes/WatsonxOrchestrate/descriptions.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Select an agent flexibly (Priority: P3)

**Goal**: Allow agent targeting through discovery list or manual `agentId` fallback.

**Independent Test**: Execute once via discovered list selection and once via manual `agentId`; verify both valid paths succeed and unknown agent returns clear resolution error.

### Tests for User Story 3

- [X] T027 [P] [US3] Add integration test for dynamic agent discovery list loading in `test/integration/node-execute.test.ts`
- [X] T028 [P] [US3] Add integration test for manual `agentId` fallback execution in `test/integration/node-execute.test.ts`
- [X] T029 [P] [US3] Add integration test for unresolved/unknown agent error behavior in `test/integration/node-execute.test.ts`

### Implementation for User Story 3

- [X] T030 [US3] Implement `listAgents` transport method and normalized option mapping in `nodes/WatsonxOrchestrate/transport.ts`
- [X] T031 [US3] Implement agent selection mode fields and dynamic options loading in `nodes/WatsonxOrchestrate/descriptions.ts`
- [X] T032 [US3] Implement runtime resolution for list/manual selection modes with manual-first fallback on discovery failure in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`
- [X] T033 [US3] Implement agent discovery and not-found category mapping to contract error taxonomy in `nodes/WatsonxOrchestrate/errors.ts`

**Checkpoint**: User Stories 1-3 are independently functional.

---

## Phase 6: User Story 4 - Diagnose failures quickly (Priority: P3)

**Goal**: Return structured actionable error outputs for key failure modes and continue-on-fail behavior.

**Independent Test**: Trigger authentication, validation, timeout, rate-limit, and upstream execution failures; verify stable error categories and item-level context.

### Tests for User Story 4

- [X] T034 [P] [US4] Add unit tests for full error-category matrix and retryable flags in `test/unit/errors.test.ts`
- [X] T035 [P] [US4] Add integration test for malformed input validation failure in `test/integration/node-execute.test.ts`
- [X] T036 [P] [US4] Add integration test for timeout and rate-limit classification in `test/integration/node-execute.test.ts`
- [X] T037 [P] [US4] Add integration test for multi-item continue-on-fail with `pairedItem` linkage in `test/integration/node-execute.test.ts`

### Implementation for User Story 4

- [X] T038 [US4] Implement structured error envelope builder (`errorCategory`, `message`, `retryable`, `details`, `metadata`) in `nodes/WatsonxOrchestrate/errors.ts`
- [X] T039 [US4] Implement continue-on-fail item emission with `pairedItem` and per-item status handling in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`
- [X] T040 [US4] Implement output-shaping option (concise vs full raw output) while preserving deterministic envelope rules in `nodes/WatsonxOrchestrate/descriptions.ts`
- [X] T041 [US4] Implement output-shaping behavior in response mapper and node execution flow in `nodes/WatsonxOrchestrate/mappers.ts`
- [X] T046 [US4] Implement internal `sessionId -> thread_id` mapping lifecycle (first call without thread header, persist provider thread, reuse on subsequent calls) in `nodes/WatsonxOrchestrate/WatsonxOrchestrate.node.ts`
- [X] T047 [US4] Enforce provider thread continuity transport contract using `X-IBM-THREAD-ID` in `nodes/WatsonxOrchestrate/transport.ts`
- [X] T048 [US4] Add regression tests for session-thread mapping bootstrap/reuse behavior in `test/integration/node-execute.test.ts`

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and release-readiness tasks affecting multiple stories.

- [X] T042 [P] Finalize package discoverability/verification metadata and `n8n` export entries in `package.json`
- [X] T043 [P] Expand usage examples, limitations, and troubleshooting guidance in `README.md`
- [X] T044 Validate quickstart flow end-to-end and update any drift in `specs/001-n8n-wxo-connector/quickstart.md`
- [X] T045 Run package hygiene verification and update ignore/publish controls as needed in `.npmignore`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phases 3-6 (User Stories)**: Depend on Phase 2; can proceed in parallel if staffed, or sequentially by priority.
- **Phase 7 (Polish)**: Depends on completion of target user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other user stories.
- **US2 (P2)**: Starts after Foundational; builds on shared auth/error primitives and can be validated independently.
- **US3 (P3)**: Starts after Foundational; independent of US2 for core behavior, but reuses shared transport/error components.
- **US4 (P3)**: Starts after Foundational; validates cross-cutting error behavior and continue-on-fail semantics.

### Within Each User Story

- Tests first (write, then confirm they fail before implementation changes).
- Mapper/model-style logic before transport integration when both are required.
- Transport/service behavior before node orchestration wiring.
- Story marked complete only after independent test criteria pass.

### Parallel Opportunities

- Setup: `T004`, `T005` can run in parallel after baseline scaffolding.
- Foundational: `T007`, `T008`, `T010` can run in parallel before node wiring convergence in `T011`.
- US1: `T012`-`T014` can run in parallel; `T018` and `T019` can proceed once `T017` is stable.
- US2: `T020`-`T022` can run in parallel; `T024` and `T026` can run in parallel after `T023`.
- US3: `T027`-`T029` can run in parallel; `T031` and `T033` can run in parallel after `T030`.
- US4: `T034`-`T037` can run in parallel; `T040` and `T041` can run in parallel after `T038`.

---

## Parallel Example: User Story 4

```bash
# Parallel test authoring for failure taxonomy coverage:
Task: "T034 Add unit tests for full error-category matrix and retryable flags in test/unit/errors.test.ts"
Task: "T035 Add integration test for malformed input validation failure in test/integration/node-execute.test.ts"
Task: "T036 Add integration test for timeout and rate-limit classification in test/integration/node-execute.test.ts"
Task: "T037 Add integration test for multi-item continue-on-fail with pairedItem linkage in test/integration/node-execute.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1) and validate independent test criteria.
4. Demo/review before broadening scope.

### Incremental Delivery

1. Setup + Foundational complete.
2. Deliver US1 (core execution contract).
3. Deliver US2 (secure credential behavior).
4. Deliver US3 (flexible agent targeting).
5. Deliver US4 (diagnostic/error robustness).
6. Finish with Phase 7 polish and release hygiene.

### Parallel Team Strategy

1. Team aligns on Setup + Foundational.
2. After Foundation checkpoint:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3
   - Dev D: US4 test matrix
3. Merge by story checkpoints to preserve independent testability.
