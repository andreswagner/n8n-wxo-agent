import { describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import { transportClient } from "../../nodes/WatsonxOrchestrate/transport";

describe("transport thread header", () => {
  it("sends X-IBM-THREAD-ID when threadId is provided", async () => {
    const httpRequestWithAuthentication = vi.fn().mockResolvedValue({ ok: true });
    const ctx = {
      getCredentials: vi.fn(async () => ({ baseUrl: "https://example.ibm.com/instances/tenant" })),
      helpers: {
        httpRequestWithAuthentication,
      },
    } as unknown as IExecuteFunctions;

    await transportClient.executeAgent(ctx, {
      agentId: "agent-1",
      payload: { input: "hi", inputType: "text" },
      timeoutMs: 30000,
      requestId: "req-1",
      threadId: "session-123",
    });

    expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
    const requestOptions = httpRequestWithAuthentication.mock.calls[0][1];
    expect(requestOptions.headers).toMatchObject({
      "x-request-id": "req-1",
      "X-IBM-THREAD-ID": "session-123",
    });
  });
});
