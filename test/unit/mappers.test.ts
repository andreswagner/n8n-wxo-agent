import { describe, expect, it } from "vitest";
import {
  buildExecutionRequest,
  normalizeInput,
  pickResponse,
  shapeSuccess,
} from "../../nodes/WatsonxOrchestrate/mappers";

describe("mappers", () => {
  it("normalizes primitive and object inputs", () => {
    expect(normalizeInput("hello").inputType).toBe("text");
    expect(normalizeInput(12).inputType).toBe("number");
    expect(normalizeInput(true).inputType).toBe("boolean");
    expect(normalizeInput({ a: 1 }).inputType).toBe("object");
    expect(normalizeInput([1, 2, 3]).inputType).toBe("array");
    expect(normalizeInput(null).inputType).toBe("null");
  });

  it("builds canonical execution request", () => {
    const request = buildExecutionRequest({
      agentId: "agent-123",
      normalized: normalizeInput({ prompt: "hi" }),
      timeoutMs: 4000,
      requestId: "req-1",
    });

    expect(request).toMatchObject({
      agentId: "agent-123",
      timeoutMs: 4000,
      requestId: "req-1",
    });
    expect(request.payload.inputType).toBe("object");
  });

  it("picks assistant content from chat completion choices", () => {
    expect(
      pickResponse({
        choices: [{ message: { role: "assistant", content: "hello" } }],
      }),
    ).toBe("hello");
  });

  it("supports output shaping mode", () => {
    const full = shapeSuccess({
      raw: { output: "ok" },
      agentId: "agent-1",
      durationMs: 5,
      threadId: "thread-1",
      outputMode: "full",
    });
    const concise = shapeSuccess({
      raw: { output: "ok" },
      agentId: "agent-1",
      durationMs: 5,
      outputMode: "concise",
    });
    const chat = shapeSuccess({
      raw: { output: "ok" },
      agentId: "agent-1",
      durationMs: 5,
      outputMode: "chat",
    });

    expect(full.raw).toEqual({ output: "ok" });
    expect(full.metadata.threadId).toBe("thread-1");
    expect(concise.raw).toBeNull();
    expect(chat.raw).toBeNull();
  });
});
