import { describe, expect, it } from "vitest";
import { toChatCompletionBody } from "../../nodes/WatsonxOrchestrate/transport";

describe("toChatCompletionBody", () => {
  it("maps string input and disables streaming", () => {
    expect(toChatCompletionBody({ input: "hi", inputType: "text" })).toEqual({
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    });
  });

  it("JSON-stringifies object input", () => {
    const body = toChatCompletionBody({ input: { a: 1 }, inputType: "object" });
    expect(body.messages).toHaveLength(1);
    expect(body.stream).toBe(false);
    expect((body.messages as { content: string }[])[0].content).toBe('{"a":1}');
  });
});
