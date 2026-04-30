import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import { executeSingleItem, resetSessionThreadMapForTests } from "../../nodes/WatsonxOrchestrate/WatsonxOrchestrate.node";
import { transportClient } from "../../nodes/WatsonxOrchestrate/transport";

describe("sessionId -> thread_id mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetSessionThreadMapForTests();
  });

  it("reuses first completion thread_id for second and third message", async () => {
    const sessionId = "session-abc";

    const executeSpy = vi.spyOn(transportClient, "executeAgent")
      .mockResolvedValueOnce({ choices: [{ message: { content: "first" } }], thread_id: "thread-123" })
      .mockResolvedValueOnce({ choices: [{ message: { content: "second" } }], thread_id: "thread-123" })
      .mockResolvedValueOnce({ choices: [{ message: { content: "third" } }], thread_id: "thread-123" });

    const context = {
      getNodeParameter: (name: string, _itemIndex: number, defaultValue?: unknown) => {
        const params: Record<string, unknown> = {
          input: "hello",
          timeoutMs: 30000,
          sessionId: sessionId,
        };
        return params[name] ?? defaultValue;
      },
      getInputData: () => [{ json: { sessionId } }],
      helpers: {},
    } as unknown as IExecuteFunctions;

    await executeSingleItem({
      context,
      itemIndex: 0,
      resolvedAgentId: "agent-1",
      outputMode: "chat",
    });
    await executeSingleItem({
      context,
      itemIndex: 0,
      resolvedAgentId: "agent-1",
      outputMode: "chat",
    });
    await executeSingleItem({
      context,
      itemIndex: 0,
      resolvedAgentId: "agent-1",
      outputMode: "chat",
    });

    expect(executeSpy).toHaveBeenCalledTimes(3);
    expect(executeSpy.mock.calls[0][1].threadId).toBeUndefined();
    expect(executeSpy.mock.calls[1][1].threadId).toBe("thread-123");
    expect(executeSpy.mock.calls[2][1].threadId).toBe("thread-123");
  });
});
