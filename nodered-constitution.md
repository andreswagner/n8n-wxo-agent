
## Core Principles

### I. Single Purpose

Nodes MUST be well-defined in their purpose. A node that exposes every possible option of an API is potentially less useful than a group of nodes that each serve a single purpose.

**Rationale**: Focused nodes are easier to understand, test, and compose into flows. Complex APIs SHOULD be decomposed into multiple purpose-specific nodes rather than one monolithic node.

### II. Simplicity First

Nodes MUST be simple to use, regardless of the underlying functionality. Implementation MUST hide complexity and avoid the use of jargon or domain-specific knowledge in the user interface.

**Rationale**: Node-RED's strength is accessibility. Users should not need deep technical expertise to use a node effectively.

### III. Input Flexibility

Nodes MUST be forgiving in what types of message properties they accept. Message properties can be strings, numbers, booleans, Buffers, objects, arrays, or nulls. A node MUST do The Right Thing when faced with any of these types.

**Rationale**: Flows connect diverse nodes; rigid type requirements create friction and errors. Nodes SHOULD coerce or handle unexpected types gracefully.

**Advanced Input Support**: When an API supports both simple and complex input formats, nodes SHOULD accept both:
- Simple format (e.g., string) for ease of use
- Full API request object format for advanced users who need full control
- Automatic detection of input format to route to appropriate handling

### IV. Output Consistency

Nodes MUST document what properties they add to messages, and they MUST be consistent and predictable in their behaviour. Output structure MUST NOT vary unexpectedly between invocations.

**Rationale**: Downstream nodes depend on predictable message shapes. Inconsistent output breaks flow reliability.

### V. Flow Position Clarity

Nodes MUST sit at the beginning, middle, or end of a flow—not all at once. A node's role in the flow topology SHOULD be clear from its design.

**Rationale**: Nodes that try to serve multiple flow positions become confusing and harder to compose correctly.

### VI. Error Handling

Nodes MUST catch errors. If a node throws an uncaught error, Node-RED will stop the entire flow as the state of the system is no longer known. Wherever possible, nodes MUST catch errors or register error handlers for any asynchronous calls they make.

**Rationale**: Uncaught exceptions halt entire flows, affecting unrelated functionality. Robust error handling is non-negotiable for production reliability.

## Platform-Specific Constraints (Node-RED)

1. **Reserved Property Names**: The following property names are reserved in `defaults` and MUST NOT be used:
   - `credentials` - reserved for Node-RED's built-in credentials system
   - `id`, `type`, `name`, `wires` - reserved for node metadata

2. **Credential Access Pattern**: Config node credentials MUST be accessed via `RED.nodes.getCredentials(nodeId)`, never via direct property access on the config node object.

3. **HTTP Admin Endpoints**: When creating editor endpoints for dynamic data (e.g., populating dropdowns), support both:
   - Deployed nodes: GET with node ID, using `RED.nodes.getCredentials()` server-side
   - Undeployed nodes: POST with credentials in request body for pre-deploy configuration

4. **URL Construction**: When base URLs include paths (e.g., `/instances/xxx`), use string concatenation (`baseUrl + path`) not `new URL(path, baseUrl)` which strips the base path.

5. **API Response Contract Verification**: Before implementing response parsing, verify the actual API response structure with a real API call. Document the exact response shape and create tests that validate payload extraction matches the real API contract.

6. **Editor UI State Management**: When editor UI loads data asynchronously (e.g., populating dropdowns), preserve and display existing configured values while loading. Never replace a valid selection with a generic "Loading..." message.

## Message Property Guidelines

- Accept `msg.payload` as the primary data carrier
- Document all properties read from and written to `msg`
- Use `node.warn()` for recoverable issues, `node.error()` for failures
- Pass errors to catch nodes via `node.error(err, msg)` pattern
- Preserve unknown message properties (do not strip `msg` of unrelated fields)

## Development Workflow

1. **Design**: Define single purpose and flow position before coding
2. **Implement**: Handle all input types; document outputs
3. **Test**: Verify behavior with strings, numbers, objects, arrays, nulls, Buffers
4. **Error paths**: Ensure all async operations have error handlers
5. **Document**: Provide clear help text and property descriptions in node HTML following Node-RED style guide:
   - Brief introduction (2-3 lines, first line as tooltip)
   - Inputs section with property types and descriptions
   - Outputs section with property types and descriptions
   - Details section with comprehensive usage information

6. **README Optimization**: README.md MUST be optimized for NPM publication and end-user consumption:
   - Clear, compelling description at the top (appears on NPM package page)
   - NPM installation instructions as primary method (not local path)
   - Quick Start section for immediate getting started
   - Features list highlighting key capabilities
   - Requirements section (Node-RED version, Node.js version, dependencies)
   - Usage examples with code snippets
   - Developer/contribution information moved to end (separated from user content)
   - Support/contact information section

## Distribution Requirements

1. **NPM Publication**: All custom nodes MUST be published to NPM to enable installation via Node-RED's palette manager and `npm install`.

2. **Package Configuration**: The `package.json` MUST be properly configured with:
   - Correct package name following Node-RED naming conventions (e.g., `node-red-contrib-*`)
   - Appropriate version number following semantic versioning
   - Node-RED keywords and category metadata (including `node-red-contrib` for palette discovery)
   - Proper entry points for node files in `node-red.nodes` section
   - Verification script to validate configuration before publication

3. **Installation Compatibility**: Nodes MUST be installable via:
   - Node-RED's Manage Palette UI
   - Command line: `npm install <package-name>`
   - Direct installation in Node-RED's user directory

4. **NPM Token Requirements**: For automated publication, use one of:
   - **Granular Access Token** with "Bypass 2FA" enabled (recommended for scripts)
   - **Automation Token** (bypasses 2FA, designed for CI/CD)
   - **Publish Token** with 2FA enabled (requires OTP codes for each publish)

5. **Publication Testing**: Before public release, publish to a test scope (e.g., `@username/node-red-contrib-*`) to verify installation and functionality.

6. **Package Exclusions and Security**: Create `.npmignore` to exclude files from the published package. **CRITICAL**: By default, NPM publishes everything in the project folder. Sensitive files MUST be explicitly excluded:
   - **Security-Critical Files** (MUST exclude):
     - `.env` files (contain API keys, credentials, secrets)
     - Any files containing API keys, tokens, passwords, or credentials
     - Test data with real credentials or sensitive information
     - Private documentation or internal notes
   - **Development Files** (SHOULD exclude):
     - `tests/` directory (unless tests are meant for end users)
     - `scripts/` directory (unless scripts are meant for end users)
     - `specs/` directory (development specifications)
     - Documentation files except `README.md` (e.g., `NPM_PUBLICATION.md`, `DEVELOPMENT.md`)
     - IDE/editor configuration files (`.vscode/`, `.idea/`, etc.)
     - Git files (`.git/`, `.gitignore`)
     - Build artifacts, logs, and temporary files
   - **Verification**: Before publishing, verify sensitive files are excluded by checking `.npmignore` or using `npm pack --dry-run` to preview the package contents.

7. **LICENSE File**: Include a LICENSE file in the package root (even if license is specified in package.json) to meet Node-RED Library requirements.

8. **Node-RED Library Registration**: After publishing to NPM, register the node with the Node-RED Flow Library at https://flows.nodered.org/add/node to make it discoverable in Node-RED's Manage Palette.

9. **README Content and Format**: README.md serves as the package description on npmjs.com and MUST be optimized for end users:
   - **Content Requirements**:
     - Describe the capabilities of the node clearly
     - List all prerequisites needed for the node to function (Node-RED version, Node.js version, external services, API keys, etc.)
     - Include any extra instructions not covered in the node's HTML info tab
     - Include example flows demonstrating the node's use
   - **Format Requirements**:
     - Use GitHub Flavored Markdown (GFM) for formatting
     - Prioritize user-facing content (installation, usage, examples)
     - Include Quick Start section for immediate getting started
     - List features and requirements clearly
     - Move developer/contribution content to end
     - Include both npm install and Manage Palette installation methods
     - Ensure README is self-contained (doesn't assume GitHub repository context)

10. **Package Metadata**: Author and repository fields SHOULD be populated before publication:
    - Use automated script (`npm run setup-metadata`) to auto-detect from git config
    - Can be overridden via `.env` with `PACKAGE_AUTHOR` and `PACKAGE_REPOSITORY_URL`
    - Author format: `"Name <email@example.com>"` or `"Name"`
    - Repository format: Full git URL (e.g., `https://github.com/user/repo.git`)

**Rationale**: NPM publication is the standard distribution mechanism for Node-RED nodes. It enables discoverability, version management, and easy installation for end users. Proper token configuration and testing workflows ensure reliable publication. Node-RED Library registration makes nodes discoverable through the official Node-RED interface. README optimization ensures users can quickly understand and use the node when discovering it on NPM. **Security is critical**: NPM publishes all project files by default, so sensitive files (credentials, API keys, secrets) MUST be explicitly excluded via `.npmignore` to prevent accidental exposure of sensitive information.

## Testing Requirements

1. **Real Integration Tests**: Nodes that interact with external APIs MUST have integration tests using real credentials, not just mocked responses. Mocks can hide API contract mismatches.

2. **Credential Management for Tests**:
   - Create `.env` file for storing test credentials (API keys, URLs)
   - Add `.env` to `.gitignore` to prevent credential leakage
   - Tests MUST load credentials from `.env` and skip gracefully if not configured
   - Document required environment variables in README.md

3. **Test Output Transparency**: Integration tests SHOULD log key outputs (tokens, API responses) for debugging and verification purposes.

4. **Test Coverage**: Each external API endpoint used by the node MUST have a corresponding integration test verifying the actual API contract.

## Test Structure

1. **Unit Tests** (`tests/unit/`): Component/library tests for underlying logic
   - Test core functionality (token manager, API client, parsers) without Node-RED runtime
   - Use standard testing frameworks (mocha, assert)
   - Focus on isolated component behavior

2. **Integration Tests** (`tests/integration/`): Node-RED node tests
   - MUST use `node-red-node-test-helper` as per Node-RED documentation
   - Test the actual node behavior in Node-RED runtime
   - Create test flows using `helper.load()` and assert node properties/output
   - Follow Node-RED's recommended testing approach from official documentation
   - Test node lifecycle, message handling, error propagation, and flow integration

## Governance

This constitution supersedes all other practices for Node-RED node development in this project. Amendments require:

1. Documentation of proposed change
2. Review of impact on existing nodes
3. Version increment per semantic versioning

All code reviews MUST verify compliance with these principles.