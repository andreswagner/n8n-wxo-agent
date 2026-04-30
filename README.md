# n8n-nodes-watsonx-orchestrate

Bring IBM watsonx Orchestrate into your n8n workflows to create AI-powered business experiences in minutes, not months.

**Tagline:** Orchestrate smarter conversations, automate real work, and scale outcomes with low-code speed.

This community node is designed for both:
- low-code and no-code teams who want fast outcomes
- technical teams who want predictable outputs and production-ready behavior

**Requirements:** n8n **2.x** (self-hosted or Cloud where community nodes are supported). Not compatible with n8n 1.x.

## Who this is for

- **Operations teams:** automate repetitive workflows while keeping context intact
- **Support teams:** deliver faster, more consistent customer and employee responses
- **IT teams:** route requests reliably with auditable outputs
- **Business builders:** prototype fast and launch production-ready automations in n8n

## Why people love it

- Build conversational automations without writing custom middleware
- Keep every interaction in context with a stable **Conversation Context Key**
- Route tasks to the right assistant with flexible agent selection
- Plug reliable outputs into CRM, ticketing, BI, and back-office systems
- Move from prototype to production with the same node

## Launch highlights

- 🚀 **Low-code speed:** go from idea to workflow quickly
- 🧠 **Context-aware conversations:** preserve continuity across messages
- 🔗 **Business-ready integration:** connect outputs to the systems teams already use

## Business outcomes

- **Faster service:** resolve customer and employee requests in fewer handoffs
- **Consistent decisions:** reuse context across turns for predictable agent behavior
- **Operational clarity:** pass structured outputs to systems and dashboards
- **Faster time-to-value:** launch new assistant flows quickly with low-code orchestration

## Popular use cases

- **Customer support:** triage and answer requests with full conversation memory
- **IT service desk:** automate repetitive service actions while preserving ticket context
- **HR operations:** support policy Q&A and guided workflows for employees
- **Sales enablement:** qualify, enrich, and route conversations to the right process

## Key capabilities

- Conversation continuity through a reusable **Conversation Context Key**
- Chat-friendly output mode (`text` / `response`) for AI-first experiences
- Envelope output modes (`chat`, `full`, `concise`) for integration flexibility
- Deterministic response contract with metadata for downstream automation
- Structured errors with continue-on-fail support for resilient flows

## Quick start (no-code friendly)

1. Create `Watsonx Orchestrate API` credentials in n8n.
2. Add the `Watsonx Orchestrate` node to your workflow.
3. Choose `Execute Agent`.
4. Select an agent (or enter one manually).
5. Provide your input payload.
6. (Optional but recommended) Set **Conversation Context Key** to a stable business value like `sessionId`, customer ID, case ID, or ticket ID.
7. For chat workflows, set **Output Mode = Chat (text output)** and map chat text to `{{$json.text}}` (or `{{$json.response}}`).

## Output contract (automation-ready)

Successful execution returns:
- `response`: normalized response payload
- `raw`: original provider payload (or `null` when output mode is `concise`)
- `metadata`: includes `agentId`, `status`, `durationMs`, `requestId`

When continue-on-fail is enabled, failed items return:
- `errorCategory`: `auth_error | agent_discovery_error | validation_error | execution_error | timeout_error | rate_limit_error`
- `message`, `retryable`, `details`, `metadata`
- `pairedItem`: links the output item to the source item index

## Notes

- Credentials are managed through the standard n8n credential flow.
- The node supports IBM Cloud watsonx Orchestrate environments.

## Development

- Install: `npm install`
- Build: `npm run build`
- Test: `npm run test`
- Package check: `npm pack --dry-run`