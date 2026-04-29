# Feature Specification: watsonx Orchestrate Agent Node

**Feature Branch**: `001-watsonx-orchestrate-agent`  
**Created**: 2025-12-18  
**Status**: Draft  
**Input**: User description: "The watsonx Orchestrate Agent node enables Node-RED flows to seamlessly invoke, converse with, and orchestrate tasks through an IBM watsonx Orchestrate Agent."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Invoke an Agent (Priority: P1)

As a Node-RED developer, I want to configure an agent node with my Watson Orchestrate credentials and agent details, then send a message to the agent and receive its response, so that I can integrate AI orchestration into my workflows without writing custom API code.

**Why this priority**: This is the core functionality—without the ability to configure and invoke an agent, the node has no value.

**Independent Test**: Can be fully tested by deploying a flow with a configured agent node, injecting a test message, and verifying the agent's response appears in the output.

**Acceptance Scenarios**:

1. **Given** a properly configured agent node with valid credentials and agent ID, **When** an input message is received, **Then** the node calls the Watson Orchestrate Agent and outputs the agent's response.
2. **Given** a configured agent node, **When** the input message contains a user query in `msg.payload`, **Then** that query is sent to the agent as the conversation input.
3. **Given** a configured agent node, **When** the agent returns a response, **Then** the response is available in `msg.payload` of the output message.

---

### User Story 2 - Handle Authentication Automatically (Priority: P1)

As a Node-RED developer, I want the node to handle authentication with Watson Orchestrate automatically using my configured credentials, so that I don't have to manage tokens or API keys manually in my flows.

**Why this priority**: Authentication is essential for any API interaction; without it, the node cannot function.

**Independent Test**: Can be tested by configuring credentials once and verifying multiple invocations succeed without manual token management.

**Acceptance Scenarios**:

1. **Given** valid API credentials stored in the node configuration, **When** the node is invoked, **Then** authentication is handled automatically without user intervention.
2. **Given** expired or invalid credentials, **When** the node attempts to invoke the agent, **Then** a clear authentication error is returned to the flow.

---

### User Story 3 - Manage Conversation Sessions (Priority: P2)

As a Node-RED developer, I want the node to maintain conversation context across multiple messages, so that I can have multi-turn conversations with the agent.

**Why this priority**: Multi-turn conversations are important for realistic agent interactions but the node can still provide value with single-turn interactions.

**Independent Test**: Can be tested by sending multiple sequential messages and verifying the agent maintains context from previous exchanges.

**Acceptance Scenarios**:

1. **Given** an active conversation session, **When** a follow-up message is sent, **Then** the agent responds with awareness of the previous context.
2. **Given** a new conversation is needed, **When** the user specifies a new session or clears the session, **Then** a fresh conversation starts without prior context.
3. **Given** a session timeout or expiration, **When** the next message is sent, **Then** the node automatically creates a new session and continues gracefully.

---

### User Story 4 - Handle Errors Gracefully (Priority: P2)

As a Node-RED developer, I want clear error messages when something goes wrong, so that I can debug issues and build robust flows.

**Why this priority**: Error handling is critical for production-ready integrations but the happy path must work first.

**Independent Test**: Can be tested by intentionally triggering error conditions (invalid credentials, network failure, invalid agent ID) and verifying appropriate error outputs.

**Acceptance Scenarios**:

1. **Given** a network failure during agent invocation, **When** the call fails, **Then** the node outputs an error message with details about the failure.
2. **Given** an invalid agent ID, **When** the node attempts to invoke the agent, **Then** a clear error indicating the agent was not found is returned.
3. **Given** any error condition, **When** the error occurs, **Then** the original input message is preserved and the error details are attached.

---

### Edge Cases

- What happens when the agent takes longer than expected to respond? (Timeout handling)
- How does the node handle rate limiting from the Watson Orchestrate API?
- What happens when the input message is empty or malformed?
- How does the node behave when Watson Orchestrate service is unavailable?
- What happens if the agent response is unexpectedly large?
- How does the node differentiate between a simple string payload and a full API request object?
- What happens when a full API request object has an empty `messages` array?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Node MUST accept configuration for Watson Orchestrate API credentials
- **FR-002**: Node MUST accept configuration for the target agent identifier
- **FR-003**: Node MUST read the user query from the input message payload
- **FR-003.1**: Node MUST accept simple string payload (e.g., `"Hello"`) for basic use cases
- **FR-003.2**: Node MUST accept full API request object payload (with `messages` array, `additional_parameters`, `context`, etc.) for advanced use cases following official API documentation
- **FR-003.3**: Node MUST automatically detect input format (string vs. full request object) and handle appropriately
- **FR-004**: Node MUST invoke the configured Watson Orchestrate Agent with the provided query
- **FR-005**: Node MUST output the agent's response in the output message payload
- **FR-006**: Node MUST handle authentication automatically using configured credentials
- **FR-007**: Node MUST manage session state to support multi-turn conversations
- **FR-008**: Node MUST provide clear error messages for authentication failures
- **FR-009**: Node MUST provide clear error messages for agent invocation failures
- **FR-010**: Node MUST support configurable timeout for agent responses
- **FR-011**: Node MUST preserve the original input message properties in the output (except payload)
- **FR-012**: Node MUST display connection status in the Node-RED editor
- **FR-013**: Node MUST provide comprehensive help text in the info tab following Node-RED style guide (introduction, inputs, outputs, details sections)
- **FR-014**: Node package MUST be published to NPM for distribution and installation via Node-RED's palette manager

### Implementation Constraints

- **IC-001**: Config node reference property MUST NOT use reserved name `credentials` - use alternative like `wxoCredentials`
- **IC-002**: API base URL may include instance paths (e.g., `/instances/xxx`); URL construction MUST preserve full path
- **IC-003**: Verify actual API endpoint paths from vendor documentation or curl examples before implementation (e.g., `/v1/orchestrate/agents` not `/v1/agents`)
- **IC-004**: Verify actual API response structure with real API calls before implementing response parsing (e.g., OpenAI-style `choices[0].message.content` vs `message.content`)
- **IC-005**: Editor UI MUST preserve existing configured values while loading async data (e.g., show selected agent name while refreshing dropdown)
- **IC-006**: Help text MUST follow Node-RED style guide: brief introduction (first line as tooltip), inputs/outputs sections with property types, and detailed usage information in Details section
- **IC-007**: `package.json` MUST be configured with Node-RED naming convention (e.g., `node-red-contrib-*`), proper versioning, Node-RED keywords (including `node-red-contrib`), and correct entry points for node files
- **IC-008**: Package MUST be installable via Node-RED's Manage Palette UI, `npm install`, and direct installation in Node-RED's user directory
- **IC-009**: NPM publication MUST use Granular Access Token with "Bypass 2FA" enabled, or Automation Token, for automated scripts (Publish tokens require OTP codes)
- **IC-010**: `.npmignore` MUST be created to exclude files from published package. **Security-Critical Files** (MUST exclude): `.env` files, any files containing API keys/tokens/passwords/credentials, test data with real credentials, private documentation. **Development Files** (SHOULD exclude): `tests/`, `scripts/`, `specs/`, documentation except `README.md`, IDE configs, Git files, build artifacts. **Verification**: Use `npm pack --dry-run` to preview package contents before publishing
- **IC-011**: Package verification script MUST support both unscoped and scoped package names (e.g., `node-red-contrib-*` and `@scope/node-red-contrib-*`)
- **IC-012**: LICENSE file MUST exist in package root (required for Node-RED Library submission)
- **IC-013**: After NPM publication, node MUST be registered with Node-RED Flow Library at https://flows.nodered.org/add/node for discoverability
- **IC-014**: README.md MUST be optimized for NPM publication. **Content Requirements**: Describe node capabilities clearly, list all prerequisites (Node-RED version, Node.js version, external services, API keys), include extra instructions not covered in node's HTML info tab, include example flows demonstrating use. **Format Requirements**: Use GitHub Flavored Markdown (GFM), prioritize user-facing content, include Quick Start section, list features and requirements clearly, include both npm install and Manage Palette installation methods, move developer content to end, ensure README is self-contained

### Key Entities

- **Agent Configuration**: Represents the connection settings including API endpoint, credentials, and agent identifier
- **Conversation Session**: Represents the state of an ongoing conversation with the agent, including session ID and context
- **Agent Request**: The input query sent to the Watson Orchestrate Agent
- **Agent Response**: The output returned by the Watson Orchestrate Agent

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure and deploy a working agent node in under 5 minutes
- **SC-002**: Node successfully handles 95% of agent invocations without errors under normal operating conditions
- **SC-003**: Error messages enable users to identify and resolve issues without consulting external documentation in 80% of cases
- **SC-004**: Multi-turn conversations maintain context correctly across at least 10 sequential exchanges
- **SC-005**: Node responds to input messages within 30 seconds under normal network conditions (excluding agent processing time)
- **SC-006**: Package is discoverable and installable via NPM and Node-RED's palette manager without manual configuration
- **SC-007**: Node is registered in Node-RED Flow Library and appears in Manage Palette search results

## Testing Requirements

### Integration Test Infrastructure
- **TR-001**: Create `.env` file for test credentials (IBM_CLOUD_API_KEY, WXO_BASE_URL)
- **TR-002**: Add `.env` to `.gitignore` to prevent credential leakage
- **TR-003**: Tests MUST load credentials from `.env` and skip gracefully if not configured

### Required Integration Tests
- **TR-004**: Token manager test - verify real IAM token is obtained with valid credentials
- **TR-005**: Agent list test - verify real agents are retrieved from WxO API
- **TR-006**: Agent invocation test - verify real agent responds to messages

### Test Output
- **TR-007**: Tests SHOULD log key outputs (token preview, agent names, response snippets) for transparency

## Assumptions

- Watson Orchestrate API is available and accessible from the Node-RED environment
- Users have valid Watson Orchestrate credentials with appropriate permissions
- Standard REST API patterns apply for authentication (API key or OAuth 2.0)
- Node-RED standard message conventions (`msg.payload`, `msg.topic`, etc.) are followed
- Session management follows Watson Orchestrate's standard session handling patterns
