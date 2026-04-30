import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IDataObject } from "n8n-workflow";
import { resetSessionThreadMapForTests, WatsonxOrchestrate } from "../../nodes/WatsonxOrchestrate/WatsonxOrchestrate.node";
import { transportClient } from "../../nodes/WatsonxOrchestrate/transport";

function createContext(overrides?: Partial<Record<string, unknown>>) {
  const params = {
    operation: "executeAgent",
    agentSelectionMode: "manual",
    agentIdManual: "agent-1",
    agentIdFromList: "",
    input: { prompt: "hello" },
    timeoutMs: 30000,
    threadId: "",
    outputMode: "full",
    ...(overrides ?? {}),
  };

  const context = {
    getInputData: () => [{ json: {} }, { json: {} }],
    getNodeParameter: (name: string) => params[name as keyof typeof params],
    continueOnFail: () => false,
    getNode: () => ({ name: "Watsonx Orchestrate" }),
    helpers: {
      httpRequestWithAuthentication: vi.fn(),
    },
    getCredentials: vi.fn(async () => ({ baseUrl: "https://example.ibm.com", token: "x" })),
  } as unknown;

  return context;
}

describe("WatsonxOrchestrate.execute", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetSessionThreadMapForTests();
  });

  it("executes successful single and multi item runs", async () => {
    vi.spyOn(transportClient, "executeAgent").mockResolvedValue({ output: "ok" } as IDataObject);
    const node = new WatsonxOrchestrate();

    const result = await node.execute.call(createContext() as never);

    expect(result[0]).toHaveLength(2);
    expect((result[0][0].json as any).metadata.status).toBe("success");
  });

  it("returns chat-friendly payload in chat output mode", async () => {
    vi.spyOn(transportClient, "executeAgent").mockResolvedValue({
      output: "hello from agent",
      thread_id: "thread-from-provider",
    } as IDataObject);
    const node = new WatsonxOrchestrate();

    const result = await node.execute.call(
      createContext({ outputMode: "chat", threadId: "session-42" }) as never,
    );

    expect(result[0]).toHaveLength(2);
    expect((result[0][0].json as any).response).toBe("hello from agent");
    expect((result[0][0].json as any).text).toBe("hello from agent");
    expect((result[0][0].json as any).threadId).toBe("thread-from-provider");
    expect((result[0][0].json as any).sessionId).toBeNull();
    expect((result[0][0].json as any).sentThreadId).toBe("session-42");
    expect((result[0][0].json as any).requestId).toMatch(/^wxo-/);
    expect((result[0][0].json as any).metadata).toBeUndefined();
  });

  it("creates session mapping on first provider response", async () => {
    const executeSpy = vi.spyOn(transportClient, "executeAgent")
      .mockResolvedValue({ output: "ok", thread_id: "provider-thread-1" } as IDataObject);
    const node = new WatsonxOrchestrate();
    const context = createContext({ threadId: "", outputMode: "chat" }) as Record<string, unknown>;
    context.getInputData = () => [{ json: { sessionId: "session-from-item" } }];

    const result = await node.execute.call(context as never);

    expect(executeSpy.mock.calls[0][1].threadId).toBeUndefined();
    expect(result[0][0].json.threadId).toBe("provider-thread-1");
    expect(result[0][0].json.sessionId).toBe("session-from-item");
  });

  it("uses input.thread_id when threadId param is empty", async () => {
    vi.spyOn(transportClient, "executeAgent").mockResolvedValue({ output: "ok" } as IDataObject);
    const node = new WatsonxOrchestrate();
    const context = createContext({
      threadId: "",
      outputMode: "chat",
      input: { thread_id: "thread-from-input", prompt: "hi" },
    }) as Record<string, unknown>;
    context.getInputData = () => [{ json: {} }];

    const result = await node.execute.call(context as never);

    expect(result[0][0].json.threadId).toBe("thread-from-input");
  });

  it("uses mapped provider thread id for subsequent messages", async () => {
    const executeSpy = vi.spyOn(transportClient, "executeAgent")
      .mockResolvedValueOnce({ output: "first", thread_id: "provider-thread-a" } as IDataObject)
      .mockResolvedValueOnce({ output: "second", thread_id: "provider-thread-b" } as IDataObject);

    const node = new WatsonxOrchestrate();
    const context = createContext({ threadId: "", outputMode: "chat" }) as Record<string, unknown>;
    context.getInputData = () => [
      { json: { sessionId: "stable-session" } },
      { json: { sessionId: "stable-session" } },
    ];

    const result = await node.execute.call(context as never);

    expect(executeSpy).toHaveBeenCalledTimes(2);
    expect(executeSpy.mock.calls[0][1].threadId).toBeUndefined();
    expect(executeSpy.mock.calls[1][1].threadId).toBe("provider-thread-a");
    expect((result[0][0].json as any).sessionId).toBe("stable-session");
    expect((result[0][1].json as any).sessionId).toBe("stable-session");
  });

  it("supports manual fallback and unknown agent failures", async () => {
    vi.spyOn(transportClient, "executeAgent").mockRejectedValue(new Error("not found"));
    const node = new WatsonxOrchestrate();

    await expect(node.execute.call(createContext({ agentIdManual: "" }) as never)).rejects.toThrow(
      /Agent ID could not be resolved/,
    );
  });

  it("classifies timeout/rate-limit and continueOnFail behavior", async () => {
    vi.spyOn(transportClient, "executeAgent")
      .mockRejectedValueOnce({ code: "ETIMEDOUT", message: "slow" })
      .mockResolvedValueOnce({ output: "second" } as IDataObject);

    const context = createContext();
    (context as { continueOnFail: () => boolean }).continueOnFail = () => true;

    const node = new WatsonxOrchestrate();
    const result = await node.execute.call(context as never);

    expect(result[0][0].json.errorCategory).toBe("timeout_error");
    expect(result[0][0].json.pairedItem).toEqual({ item: 0 });
    expect((result[0][1].json as any).metadata.status).toBe("success");
  });

  it("maps auth failures without leaking token", async () => {
    vi.spyOn(transportClient, "executeAgent").mockRejectedValue({
      statusCode: 401,
      message: "Bearer token abcdef",
      token: "token=supersecret",
    });

    const context = createContext();
    (context as { continueOnFail: () => boolean }).continueOnFail = () => true;

    const node = new WatsonxOrchestrate();
    const result = await node.execute.call(context as never);

    const item = result[0][0].json;
    expect(item.errorCategory).toBe("auth_error");
    expect(JSON.stringify(item)).not.toContain("supersecret");
  });

  it("loads agent options from discovery", async () => {
    vi.spyOn(transportClient, "listAgents").mockResolvedValue([
      { name: "Agent One", value: "agent-1" },
      { name: "Agent Two", value: "agent-2" },
    ]);

    const node = new WatsonxOrchestrate();
    const options = await node.methods.loadOptions.loadAgents.call({} as never);

    expect(options).toHaveLength(2);
  });

  it("returns UI-friendly diagnostics in debugAuthentication operation", async () => {
    vi.spyOn(transportClient, "debugAuthentication").mockResolvedValue({
      operation: "debugAuthentication",
      ok: false,
      auth: { authorizationMasked: "Bearer abc...xyz" },
      http: { statusCode: 401 },
    } as IDataObject);

    const node = new WatsonxOrchestrate();
    const result = await node.execute.call(createContext({ operation: "debugAuthentication" }) as never);

    expect(result[0]).toHaveLength(2);
    expect((result[0][0].json as IDataObject).operation).toBe("debugAuthentication");
    expect((result[0][0].json as IDataObject).http).toEqual({ statusCode: 401 });
  });
});
