import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IDataObject } from "n8n-workflow";
import { WatsonxOrchestrate } from "../../nodes/WatsonxOrchestrate/WatsonxOrchestrate.node";
import { transportClient } from "../../nodes/WatsonxOrchestrate/transport";

function createContext(overrides?: Partial<Record<string, unknown>>) {
  const params = {
    operation: "executeAgent",
    agentSelectionMode: "manual",
    agentIdManual: "agent-1",
    agentIdFromList: "",
    input: { prompt: "hello" },
    timeoutMs: 30000,
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
  });

  it("executes successful single and multi item runs", async () => {
    vi.spyOn(transportClient, "executeAgent").mockResolvedValue({ output: "ok" } as IDataObject);
    const node = new WatsonxOrchestrate();

    const result = await node.execute.call(createContext() as never);

    expect(result[0]).toHaveLength(2);
    expect((result[0][0].json as any).metadata.status).toBe("success");
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
});
