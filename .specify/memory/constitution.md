<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.1.0
- Modified principles:
  - II. Minimal Configuration -> II. Minimal Configuration and Robust Inputs
  - III. Transparent Execution Flow -> III. Transparent Execution and Stable Output Contracts
  - V. Reliability and Observable Failures -> V. Reliability, Error Taxonomy, and Observable Failures
- Added sections:
  - Release and Distribution Hygiene
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ `.specify/templates/plan-template.md` (validated; no changes required)
  - ✅ `.specify/templates/spec-template.md` (validated; no changes required)
  - ✅ `.specify/templates/tasks-template.md` (validated; no changes required)
  - ✅ `.specify/templates/commands/*.md` (not present; no updates required)
  - ✅ `README.md` (already aligned with scope and intent)
- Follow-up TODOs:
  - None
-->
# n8n Watsonx Orchestrate Connector Constitution

## Core Principles

### I. n8n-Native Design
All node behavior MUST follow established n8n node architecture, property definitions,
and item-based input/output flow. Features that diverge from n8n interaction patterns
or require non-standard operator behavior MUST NOT be introduced in the connector.
Rationale: consistency with n8n conventions reduces user confusion and integration risk.

### II. Minimal Configuration and Robust Inputs
The node MUST require only essential runtime configuration: credentials, target agent
selection, and input payload. Additional parameters MAY be added only when they are
necessary to support Watsonx Orchestrate compatibility or correctness, and MUST include
safe defaults. The node MUST accept common payload shapes used in n8n flows (string,
number, boolean, object, array, and null) and normalize inputs deterministically.
Input coercion rules MUST be explicit and documented, and invalid payloads MUST fail with
structured validation errors. Rationale: minimizing setup friction and handling varied
upstream payloads improve adoption and reduce runtime surprises.

### III. Transparent Execution and Stable Output Contracts
Execution MUST remain a thin wrapper around Watsonx Orchestrate agent invocation. Data
flow from n8n input to upstream request and back to n8n output MUST be traceable in code
and documentation. Hidden data transformations MUST be avoided unless required for API
compatibility, and when used they MUST be explicit and documented. Rationale: transparent
behavior simplifies debugging and trust. Output structure MUST remain stable and
predictable across invocations for equivalent outcomes. All emitted fields (including
`response`, `metadata`, and error-related fields) MUST be documented.

### IV. Extensible-by-Default Architecture
The implementation MUST keep extension points for future support of streaming responses,
multi-turn interactions, and tool or function-calling capabilities where supported by
upstream APIs. Core abstractions MUST remain modular so future capabilities can be added
without breaking existing workflows. Rationale: preserving extensibility avoids costly
rewrites and enables controlled evolution.

### V. Reliability, Error Taxonomy, and Observable Failures
Authentication, discovery, and execution failures MUST produce structured, n8n-compatible
error outputs that clearly identify failure class and actionable context without exposing
secrets. Credentials MUST never be logged or emitted in node outputs. Rationale: reliable
error behavior is required for workflow resilience and operator troubleshooting. Error
responses MUST include a consistent taxonomy with at least: `auth_error`,
`agent_discovery_error`, `execution_error`, `validation_error`, and applicable upstream
categories such as `rate_limit_error` or `timeout_error`.

## Project Scope and Constraints

- Purpose: deliver a custom n8n node that securely authenticates to IBM Watsonx
  Orchestrate, allows agent selection, executes selected agents, and returns structured
  results that align with n8n data conventions.
- Functional baseline:
  - Authentication via n8n credentials storage and compatible API key or token handling.
  - Agent discovery via dynamic retrieval where available, with manual agent ID fallback.
  - Synchronous agent execution with payloads sourced from upstream n8n items.
  - Response normalization into predictable JSON output, including `response` and
    `metadata` fields when available.
- Non-functional constraints:
  - Performance: connector overhead MUST be minimal and avoid unnecessary transforms.
  - Security: secrets MUST remain confined to credential systems and never leak to logs.
  - Compatibility: implementation MUST target stable n8n node SDK APIs only.
- Technical constraints:
  - Language MUST be TypeScript.
  - Framework MUST be n8n Node Development SDK.
  - Architecture MUST include node definition, credential definition, and execute logic.
- Out of scope for the initial version:
  - Streaming responses.
  - Complex session management.
  - Multi-agent orchestration.
  - Heavy UI customization.

## Development Workflow and Quality Gates

- Delivery workflow MUST follow this sequence:
  1. Specification: define schema for inputs, outputs, and credentials.
  2. Interface design: map UX fields to n8n properties with defaults and validation.
  3. Integration layer: implement Watsonx Orchestrate client and authentication.
  4. Execution logic: transform n8n input to agent payload and normalize response.
  5. Testing: validate behavior in local n8n with mocked and realistic responses.
- Testing obligations:
  - Real upstream contract checks MUST validate assumed Watsonx Orchestrate response
    shapes before finalizing parsing logic.
  - Integration tests MUST cover supported payload types and error taxonomy behavior.
  - Configuration UX tests MUST verify previously selected agent values are preserved when
    discovery calls fail or return delayed results.
- Acceptance gates for feature completion:
  - Node installs and loads correctly in n8n.
  - Users can authenticate, select an agent, and execute the agent in a workflow.
  - Outputs are structured, predictable, and compatible with downstream nodes.
  - Documentation includes usage guidance, credential setup, and an example workflow.
- Future evolution planning:
  - Conversational memory support.
  - Batch execution support.
  - Enhanced observability (logging and traces).
  - Potential integrations with additional orchestration platforms.

## Release and Distribution Hygiene

- Package metadata MUST be complete and suitable for distribution (name, versioning,
  repository, and relevant keywords).
- Sensitive files MUST be excluded from package artifacts (credentials, `.env` files,
  private notes, and internal-only assets).
- A pre-release package audit MUST be run using `npm pack --dry-run` (or equivalent) to
  verify expected publish contents.
- README MUST include, at minimum: installation, credential setup, quick start usage,
  example workflow, requirements/limitations, and support/contact pointers.

## Governance

This constitution is the authoritative source for project engineering and design
decisions. All specifications, plans, tasks, code reviews, and releases MUST verify
compliance with these principles and constraints.

Amendments:
- Any amendment MUST include a clear rationale, impacted sections, and migration
  implications for in-flight work.
- Amendment proposals MUST be reviewed alongside updates to dependent templates and
  operational guidance.

Versioning policy:
- MAJOR: backward-incompatible governance or principle redefinitions/removals.
- MINOR: new principle or materially expanded section/guidance.
- PATCH: clarifications, wording improvements, or non-semantic refinements.

Compliance review expectations:
- Every `/speckit-plan` output MUST pass a constitution check before implementation.
- Every `/speckit-tasks` output MUST preserve traceability to constitutional constraints.
- Any deliberate exception MUST be documented in the relevant feature plan with explicit
  justification and reviewer approval.

**Version**: 1.1.0 | **Ratified**: 2026-04-29 | **Last Amended**: 2026-04-29
