# Feature Specification: n8n Watsonx Orchestrate Connector Node

**Feature Branch**: `001-n8n-wxo-connector`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "Custom n8n node to authenticate with Watsonx Orchestrate, select an agent, send input, and return structured output"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Execute an external agent in a workflow (Priority: P1)

A workflow builder configures the connector node with valid access credentials, selects a target agent, passes dynamic input from upstream nodes, and receives a structured result for downstream automation.

**Why this priority**: This is the core value of the feature; without successful end-to-end execution, the connector provides no usable outcome.

**Independent Test**: Can be fully tested by running a workflow with one connector node configured with valid credentials, a valid agent, and sample input, then verifying structured output is produced.

**Acceptance Scenarios**:

1. **Given** valid credentials and a valid agent selection, **When** the node executes with a valid payload, **Then** it returns at least one output item containing a primary response, raw result data, and execution metadata.
2. **Given** upstream workflow data is mapped into the connector input, **When** the node executes, **Then** the mapped values are transmitted and reflected in the resulting agent output context.

---

### User Story 2 - Configure access securely and clearly (Priority: P2)

A user provides account credentials through the node's credential configuration so that the connector can access their available agents without exposing sensitive values in workflow fields.

**Why this priority**: Reliable and secure access is required for repeated use, but it is secondary to the main execution journey.

**Independent Test**: Can be fully tested by configuring credentials once and validating that multiple node executions succeed without re-entering secrets in regular node parameters.

**Acceptance Scenarios**:

1. **Given** credentials are missing or invalid, **When** the node executes, **Then** it fails with a clear authentication error and no partial success output.
2. **Given** credentials are valid, **When** the user saves and executes the node, **Then** the connector authenticates successfully and continues to agent resolution.

---

### User Story 3 - Select an agent flexibly (Priority: P3)

A user chooses a target agent either from an available selection list or by entering an agent identifier manually, enabling use cases where discovery is available and where direct targeting is preferred.

**Why this priority**: Flexible agent targeting improves usability and adoption, but basic execution can still exist with one selection method.

**Independent Test**: Can be fully tested by executing once with list-based selection and once with manual identifier entry, both producing successful outcomes for valid targets.

**Acceptance Scenarios**:

1. **Given** agent discovery data is available, **When** the user opens the agent field, **Then** the user can select from available agents.
2. **Given** no suitable list option is chosen, **When** the user enters a manual agent identifier and executes, **Then** the node targets that identifier and either succeeds or returns a clear "agent not found" error.

---

### User Story 4 - Diagnose failures quickly (Priority: P3)

A workflow builder receives clear, structured failure details when execution cannot complete, so they can correct configuration or input and restore workflow operation quickly.

**Why this priority**: Robust troubleshooting improves production reliability and user confidence, while still being secondary to core execution behavior.

**Independent Test**: Can be fully tested by triggering distinct failure types (invalid credentials, invalid agent, malformed input, temporary provider failure) and confirming each output includes actionable category and guidance.

**Acceptance Scenarios**:

1. **Given** an authentication failure, **When** execution is attempted, **Then** the returned error clearly identifies access configuration as the root cause.
2. **Given** a temporary provider failure or timeout, **When** execution fails, **Then** the returned error classifies it as a transient service issue and indicates that retry is appropriate.

---

### Edge Cases

- Input payload is empty or null.
- Input payload exceeds expected size limits for a single request.
- Input is provided as either a simple text payload or a structured request object.
- Agent returns plain text or mixed content instead of structured JSON.
- Agent returns multiple result records where one execution maps to multiple output items.
- Response latency exceeds expected workflow timing, including timeout behavior.
- Temporary service unavailability during execution.
- Upstream system or provider enforces request rate limits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to configure reusable credentials for connecting to their Watsonx Orchestrate account.
- **FR-002**: The system MUST validate access during node execution and return a clear authentication error when credentials are invalid or expired.
- **FR-003**: The system MUST allow users to specify a target agent through either selection from available agents or manual identifier entry.
- **FR-004**: The system MUST reject execution with a clear error when the specified agent cannot be resolved.
- **FR-005**: The system MUST accept input payloads from static values and workflow expressions.
- **FR-006**: The system MUST support both concise prompt-style input and structured request-style input, with consistent behavior for each.
- **FR-007**: The system MUST automatically interpret the provided input form and transform it into the target agent request format before execution.
- **FR-008**: The system MUST execute the selected agent and return normalized output as one or more workflow-compatible items.
- **FR-009**: The system MUST include in each output item: primary response content, original raw result content, and execution metadata including agent identifier and status.
- **FR-010**: The system MUST provide structured, actionable errors for malformed input, unavailable service, rate limiting, timeout conditions, and execution failures.
- **FR-011**: The system MUST support graceful handling of non-JSON agent responses by returning usable response content and raw data.
- **FR-012**: The system MUST preserve deterministic output structure across successful executions so downstream nodes can reliably consume results.
- **FR-013**: The system MUST allow users to reference data from previous workflow nodes in connector input fields.
- **FR-014**: The system MUST allow users to set an execution timeout limit for agent calls.

### Key Entities *(include if feature involves data)*

- **Connector Credentials**: User-provided secure access details used to authenticate connector executions.
- **Agent Reference**: A selected or manually entered identifier that points to the target automation agent.
- **Execution Input Payload**: User-provided and/or expression-derived data submitted to the selected agent.
- **Execution Result Item**: Normalized workflow output containing response content, raw provider payload, and metadata.
- **Execution Metadata**: Context fields describing status, target agent, and elapsed execution timing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid executions complete successfully and return structured output on first attempt under normal service availability.
- **SC-002**: 100% of failed executions return a user-actionable error category (authentication, agent resolution, input validation, or service failure).
- **SC-003**: Users can configure the node and complete a first successful execution in under 10 minutes using only field descriptions and standard workflow knowledge.
- **SC-004**: 100% of successful executions produce output that conforms to the documented response shape required by downstream workflow steps.
- **SC-005**: At least 85% of sampled failure events are resolved by users without external support because returned errors identify cause and next action.

## Assumptions

- Watsonx Orchestrate supports synchronous agent execution for this connector scope.
- Users already have valid access credentials and at least one callable agent.
- Agent discovery for selection may be available, but manual identifier entry is always supported.
- Initial scope covers single-turn request/response execution only.
- Standard workflow retry behavior is acceptable for transient external service issues.
