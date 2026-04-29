# Implementation Plan: watsonx Orchestrate Agent Node

**Branch**: `001-watsonx-orchestrate-agent` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-watsonx-orchestrate-agent/spec.md`

## Summary

Build a Node-RED node that enables users to invoke IBM Watson Orchestrate agents by simply pasting their service credentials JSON. The node handles IAM authentication, tenant discovery, and provides a simple interface for single and multi-turn agent conversations.

## Technical Context

**Language/Version**: JavaScript (Node.js 18+)  
**Primary Dependencies**: Node-RED API, node-fetch (HTTP client)  
**Storage**: Node-RED context (flow/global) for token caching  
**Testing**: Node-RED node-test-helper, mocha  
**Target Platform**: Node-RED 3.x+  
**Project Type**: Node-RED custom node package (NPM-published)  
**Distribution**: NPM package following Node-RED naming conventions (`node-red-contrib-*`)  
**Performance Goals**: <100ms overhead (excluding API latency)  
**Constraints**: Token refresh before expiry, graceful error handling, NPM publication required  
**Scale/Scope**: Single node package with config node for credentials

## Technical Constraints (Node-RED Gotchas)

1. **Reserved Property Names**: Never use `credentials` as a property name in `defaults` - it's reserved by Node-RED for the built-in credentials system. Use alternative names like `wxoCredentials`.

2. **Accessing Config Node Credentials**: Use `RED.nodes.getCredentials(configNodeId)` to fetch secure credentials server-side, not direct property access on the config node object.

3. **URL Construction**: When baseUrl includes a path (e.g., `/instances/xxx`), use string concatenation (`baseUrl + path`) not `new URL(path, baseUrl)` which strips the base path.

4. **API Endpoint Verification**: Always verify actual API endpoint paths from working curl examples before implementation. The WxO API uses `/v1/orchestrate/agents`, not `/v1/agents`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single Purpose | ✅ PASS | Node does one thing: invoke WxO agent |
| II. Simplicity First | ✅ PASS | Paste credentials JSON, select agent, done |
| III. Input Flexibility | ✅ PASS | Accepts string or object payload |
| IV. Output Consistency | ✅ PASS | Documented output structure in data-model.md |
| V. Flow Position Clarity | ✅ PASS | Middle node: receives input, outputs response |
| VI. Error Handling | ✅ PASS | All errors caught, sent to catch nodes |
| Distribution Requirements | ✅ PASS | Package will be published to NPM with proper configuration |

**Post-Design Re-check**: All principles satisfied. Credential parsing and auto-tenant discovery align with Simplicity First. NPM publication planned for distribution.

## Project Structure

### Documentation (this feature)

```text
specs/001-watsonx-orchestrate-agent/
├── plan.md              # This file
├── research.md          # Authentication & API research
├── data-model.md        # Entity definitions & message contracts
├── quickstart.md        # User setup guide
├── contracts/           # OpenAPI spec for WxO API
│   └── wxo-api.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
nodes/
├── wxo-agent/
│   ├── wxo-agent.js       # Main node implementation
│   ├── wxo-agent.html     # Node-RED editor UI
│   └── icons/
│       └── wxo-icon.svg
├── wxo-credentials/
│   ├── wxo-credentials.js  # Config node for credentials
│   └── wxo-credentials.html
└── lib/
    ├── wxo-client.js       # API client wrapper
    └── token-manager.js    # IAM token handling

tests/
├── unit/
│   ├── token-manager.test.js
│   ├── token-caching.test.js
│   ├── wxo-client.test.js
│   ├── wxo-agent-endpoint.test.js
│   ├── wxo-chat.test.js
│   ├── wxo-conversation.test.js
│   ├── wxo-errors.test.js
│   ├── wxo-input-parsing.test.js
│   ├── wxo-new-session.test.js
│   ├── wxo-output-format.test.js
│   └── wxo-timeout.test.js
└── integration/
    ├── flow-basic.test.js
    ├── flow-error-handling.test.js
    └── e2e-conversation.test.js

.env                  # Test credentials (gitignored)
.gitignore            # Must include .env
package.json          # NPM package configuration (node-red-contrib-* naming, keywords, entry points)
README.md             # Installation and usage instructions
```

**Structure Decision**: Node-RED custom node package structure with separate config node for reusable credentials.

## Complexity Tracking

No violations. Design follows constitution principles without exceptions.

## Key Design Decisions

1. **Credential Input**: Accept full JSON paste OR individual apikey/url fields
2. **Tenant Discovery**: Auto-fetch tenant list, prefer "wxo-dev" or first available
3. **Token Management**: Cache in node context, refresh 5 min before expiry
4. **Thread Handling**: Store thread_id in msg.topic for flow access (Node-RED convention)
5. **Agent Selection**: Dropdown populated from API, displays `display_name` (falls back to `name` or `id`), stores agent ID internally
6. **Input Flexibility**: Support both simple string messages and full API request objects (with messages array, additional_parameters, context, etc.) - automatically detects format
7. **Node Appearance**: 
   - Icon: `WxO.svg` with transparent background
   - Node background color: `#FFFFFF` (white)
   - Icon viewBox: `-6 -6 44 44` for proper sizing with padding (ensures consistent display in palette and canvas)
8. **Help Documentation**: Follow Node-RED style guide with brief introduction (first line as tooltip), clear inputs/outputs sections, and comprehensive Details section covering all input formats and usage patterns
9. **README Optimization for NPM**:
   - **Content Requirements** (IC-014):
     - Describe node capabilities clearly
     - List all prerequisites (Node-RED version, Node.js version, external services, API keys)
     - Include extra instructions not covered in node's HTML info tab
     - Include example flows demonstrating the node's use
   - **Format Requirements** (IC-014):
     - Use GitHub Flavored Markdown (GFM) for formatting
     - Structure: Description → Installation (npm + Manage Palette) → Quick Start → Features → Requirements → Usage → Input/Output → Error Handling → Development (end)
     - Prioritize end-user content over developer content
     - Include both npm install and Manage Palette installation methods
     - Quick Start section for immediate getting started
     - Features list highlighting key capabilities
     - Self-contained (doesn't assume GitHub repository context)
10. **NPM Package Configuration**:
   - Package name: Follow Node-RED convention (`node-red-contrib-wxo-agent` or scoped `@username/node-red-contrib-wxo-agent` for testing)
   - Version: Semantic versioning (start with 0.1.0 for initial release)
   - Keywords: Include `node-red`, `node-red-contrib`, `watsonx`, `orchestrate`, `ibm`
   - Entry points: Properly configured `node-red` section in package.json pointing to node files
   - Installation: Must work via Node-RED's Manage Palette UI, `npm install`, and direct installation
   - Verification: Automated script to verify package configuration before publication
   - Exclusions: `.npmignore` file to exclude files from published package (IC-010):
     - **Security-Critical Files** (MUST exclude): `.env` files, any files containing API keys/tokens/passwords/credentials, test data with real credentials, private documentation
     - **Development Files** (SHOULD exclude): `tests/`, `scripts/`, `specs/`, documentation except `README.md`, IDE configs, Git files, build artifacts
     - **Verification**: Use `npm pack --dry-run` to preview package contents before publishing
   - Publication: Use test scope for initial testing, then publish publicly when ready

## Testing Strategy

1. **Real Integration Tests**: Use actual API credentials, not mocks - mocks can hide API contract mismatches
2. **Credential Management**: Store test credentials in `.env` file (gitignored), tests skip if not configured
3. **Test Transparency**: Log key outputs (token previews, agent names) for debugging
4. **Required Environment Variables**:
   - `IBM_CLOUD_API_KEY`: IBM Cloud API key for IAM authentication (required for API tests)
   - `WXO_BASE_URL`: Full Watson Orchestrate instance URL (including `/instances/xxx`) (required for API tests)
   - `NPM_USERNAME`: NPM username (optional, useful for automation and scoped packages, required only for NPM publication testing T031)
   - `NPM_TOKEN`: NPM authentication token (optional, required only for NPM publication testing T031)
     - **Token Type**: Use Granular Access Token with "Bypass 2FA" enabled, or Automation Token, for automated scripts
     - **Publish Token**: Requires OTP codes if 2FA is enabled on account
   - `NPM_REGISTRY`: NPM registry URL (optional, defaults to public npmjs.org if not set)
5. **Package Installation Testing**: Verify package installs correctly via:
   - Local installation testing (T028-T030): Can be done without NPM credentials by testing local package
   - Node-RED's Manage Palette UI (search and install) - requires published package and Node-RED Library registration
   - Command line: `npm install <package-name>` - requires published package
   - Direct installation in Node-RED user directory - can test locally
   - **Note**: For full end-to-end testing, publish to NPM first (requires `NPM_TOKEN`), then test installation from published package

6. **Node-RED Library Registration**: After NPM publication, register node at https://flows.nodered.org/add/node to make it discoverable in Manage Palette. Required files:
   - LICENSE file in package root (Apache-2.0)
   - README.md with usage instructions (must meet IC-014 requirements: describe capabilities, list prerequisites, include extra instructions, include example flows, use GFM)
   - Verified package configuration (`npm run verify-library`)
   - Package metadata (author and repository) populated via `npm run setup-metadata` (auto-detects from git)
