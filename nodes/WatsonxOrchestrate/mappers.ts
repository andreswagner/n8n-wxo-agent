import type { IDataObject } from "n8n-workflow";
import { buildStructuredError, type StructuredExecutionError } from "./errors";

export type InputType = "text" | "number" | "boolean" | "object" | "array" | "null";

export interface NormalizedInput {
  rawInput: unknown;
  inputType: InputType;
  normalizedInput: IDataObject;
}

export interface ExecutionRequest {
  agentId: string;
  payload: IDataObject;
  timeoutMs: number;
  requestId?: string;
  threadId?: string;
}

export interface ExecutionSuccessEnvelope {
  response: unknown;
  raw: unknown;
  metadata: {
    agentId: string;
    status: "success";
    durationMs: number;
    requestId?: string;
  };
}

export function normalizeInput(rawInput: unknown): NormalizedInput {
  if (rawInput === null) {
    return {
      rawInput,
      inputType: "null",
      normalizedInput: {
        input: null,
      },
    };
  }

  if (typeof rawInput === "string") {
    return { rawInput, inputType: "text", normalizedInput: { input: rawInput } };
  }

  if (typeof rawInput === "number") {
    return { rawInput, inputType: "number", normalizedInput: { input: rawInput } };
  }

  if (typeof rawInput === "boolean") {
    return { rawInput, inputType: "boolean", normalizedInput: { input: rawInput } };
  }

  if (Array.isArray(rawInput)) {
    return {
      rawInput,
      inputType: "array",
      normalizedInput: {
        input: rawInput,
      },
    };
  }

  if (typeof rawInput === "object") {
    return {
      rawInput,
      inputType: "object",
      normalizedInput: {
        input: rawInput as IDataObject,
      },
    };
  }

  throw buildStructuredError({
    category: "validation_error",
    message: "Unsupported input type. Use JSON-compatible values.",
    retryable: false,
  });
}

export function buildExecutionRequest(params: {
  agentId: string;
  normalized: NormalizedInput;
  timeoutMs: number;
  requestId?: string;
  threadId?: string;
}): ExecutionRequest {
  if (!params.agentId?.trim()) {
    throw buildStructuredError({
      category: "validation_error",
      message: "agentId is required",
      retryable: false,
    });
  }

  const timeoutMs = Number(params.timeoutMs);
  if (Number.isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw buildStructuredError({
      category: "validation_error",
      message: "timeoutMs must be between 1000 and 120000",
      retryable: false,
    });
  }

  return {
    agentId: params.agentId,
    payload: {
      input: params.normalized.normalizedInput.input,
      inputType: params.normalized.inputType,
    },
    timeoutMs,
    requestId: params.requestId,
    threadId: params.threadId?.trim() || undefined,
  };
}

export function pickResponse(raw: unknown): unknown {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== "object") {
    return raw;
  }

  const payload = raw as IDataObject;
  const choices = payload.choices as IDataObject[] | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as IDataObject;
    const message = first.message as IDataObject | undefined;
    if (message?.content !== undefined && message.content !== null) {
      return message.content;
    }
    if (first.text !== undefined) {
      return first.text;
    }
  }
  return payload.output ?? payload.result ?? payload.response ?? raw;
}

export function shapeSuccess(params: {
  raw: unknown;
  agentId: string;
  durationMs: number;
  requestId?: string;
  outputMode?: "concise" | "full" | "chat";
}): ExecutionSuccessEnvelope {
  return {
    response: pickResponse(params.raw),
    raw: params.outputMode === "full" ? params.raw : null,
    metadata: {
      agentId: params.agentId,
      status: "success",
      durationMs: Math.max(0, Math.round(params.durationMs)),
      requestId: params.requestId,
    },
  };
}

export function shapeContinueOnFail(error: StructuredExecutionError, itemIndex: number): IDataObject {
  return {
    ...error,
    pairedItem: { item: itemIndex },
  };
}
