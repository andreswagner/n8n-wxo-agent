import {
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodePropertyOptions,
  type INodeType,
  type INodeTypeDescription,
} from "n8n-workflow";
import {
  buildStructuredError,
  classifyProviderError,
  sanitizeDetails,
  type StructuredExecutionError,
} from "./errors";
import { buildExecutionRequest, normalizeInput, shapeContinueOnFail, shapeSuccess } from "./mappers";
import { nodeProperties } from "./descriptions";
import { transportClient } from "./transport";

export async function executeSingleItem(params: {
  context: IExecuteFunctions;
  itemIndex: number;
  resolvedAgentId: string;
  outputMode: "full" | "concise" | "chat";
}): Promise<INodeExecutionData> {
  const input = params.context.getNodeParameter("input", params.itemIndex, null) as unknown;
  const timeoutMs = params.context.getNodeParameter("timeoutMs", params.itemIndex, 30000) as number;
  const threadIdRaw = params.context.getNodeParameter("threadId", params.itemIndex, "") as string;
  const itemJson = (params.context.getInputData()[params.itemIndex]?.json ?? {}) as IDataObject;
  const payloadThreadId = readInputThreadId(input);
  const sessionIdFallback = String(itemJson.sessionId ?? "").trim();
  const effectiveThreadId = String(threadIdRaw ?? "").trim() || payloadThreadId || sessionIdFallback;
  const requestId = `wxo-${Date.now()}-${params.itemIndex}`;
  const started = Date.now();

  const normalized = normalizeInput(input);
  const request = buildExecutionRequest({
    agentId: params.resolvedAgentId,
    normalized,
    timeoutMs,
    requestId,
    threadId: effectiveThreadId,
  });

  const raw = await transportClient.executeAgent(params.context, request);
  const responseThreadId = readResponseThreadId(raw) ?? request.threadId;
  const durationMs = Date.now() - started;

  const envelope = shapeSuccess({
    raw,
    agentId: params.resolvedAgentId,
    durationMs,
    requestId,
    threadId: responseThreadId,
    outputMode: params.outputMode,
  });

  if (params.outputMode === "chat") {
    const chatResponse = envelope.response;
    const text = typeof chatResponse === "string" ? chatResponse : JSON.stringify(chatResponse ?? "");
    return {
      json: {
        response: chatResponse,
        text,
        threadId: responseThreadId ?? null,
        sessionId: responseThreadId ?? null,
        requestId,
      } as IDataObject,
    };
  }

  return {
    json: envelope as unknown as IDataObject,
  };
}

function readInputThreadId(input: unknown): string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return "";
  }
  const obj = input as IDataObject;
  const candidate = obj.thread_id ?? obj.threadId;
  return typeof candidate === "string" ? candidate.trim() : "";
}

function readResponseThreadId(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const payload = raw as IDataObject;
  const candidate = payload.thread_id ?? payload.threadId;
  if (typeof candidate !== "string") {
    return undefined;
  }
  const t = candidate.trim();
  return t.length > 0 ? t : undefined;
}

export class WatsonxOrchestrate implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Watsonx Orchestrate",
    name: "watsonxOrchestrate",
    icon: "file:wxo.svg",
    group: ["transform"],
    version: [1],
    subtitle: '={{$parameter["operation"]}}',
    description: "Execute IBM Watsonx Orchestrate agents",
    defaults: {
      name: "Watsonx Orchestrate",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "watsonxOrchestrateApi",
        required: true,
      },
    ],
    properties: nodeProperties,
  };

  methods = {
    loadOptions: {
      async loadAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        return transportClient.listAgents(this);
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const operation = this.getNodeParameter("operation", 0, "executeAgent") as string;

    if (operation === "debugAuthentication") {
      const returnData: INodeExecutionData[] = [];
      for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        const debug = await transportClient.debugAuthentication(this);
        returnData.push({ json: debug });
      }
      return [returnData];
    }

    if (operation !== "executeAgent") {
      throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
    }

    const outputMode = this.getNodeParameter("outputMode", 0, "full") as "full" | "concise" | "chat";
    const continueOnFail = this.continueOnFail();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      try {
        const selectionMode = this.getNodeParameter("agentSelectionMode", itemIndex, "list") as "list" | "manual";
        const listValue = this.getNodeParameter("agentIdFromList", itemIndex, "") as string;
        const manualValue = this.getNodeParameter("agentIdManual", itemIndex, "") as string;

        const resolvedAgentId =
          selectionMode === "manual" ? manualValue.trim() : (listValue || manualValue).trim();

        if (!resolvedAgentId) {
          throw buildStructuredError({
            category: "agent_discovery_error",
            message: "Agent ID could not be resolved from list or manual entry",
            retryable: false,
          });
        }

        const execution = await executeSingleItem({
          context: this,
          itemIndex,
          resolvedAgentId,
          outputMode,
        });

        returnData.push(execution);
      } catch (error) {
        const structured = normalizeExecutionError(error, itemIndex);

        if (!continueOnFail) {
          throw new NodeOperationError(this.getNode(), structured.message, {
            itemIndex,
            description: `Error category: ${structured.errorCategory}`,
          });
        }

        returnData.push({
          json: shapeContinueOnFail(structured, itemIndex),
          pairedItem: { item: itemIndex },
        });
      }
    }

    return [returnData];
  }
}

function normalizeExecutionError(error: unknown, itemIndex: number): StructuredExecutionError {
  if (isStructuredExecutionError(error)) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const raw = error as IDataObject;
    const classification = classifyProviderError(raw);
    return buildStructuredError({
      category: classification.category,
      message: String(raw.message ?? "Provider request failed"),
      retryable: classification.retryable,
      details: sanitizeDetails(raw),
    });
  }

  if (error instanceof Error) {
    return buildStructuredError({
      category: "execution_error",
      message: error.message,
      retryable: false,
      details: { itemIndex },
    });
  }

  return buildStructuredError({
    category: "execution_error",
    message: "Unknown execution failure",
    retryable: false,
    details: { itemIndex },
  });
}

function isStructuredExecutionError(value: unknown): value is StructuredExecutionError {
  return (
    typeof value === "object" &&
    value !== null &&
    "errorCategory" in value &&
    "message" in value &&
    "retryable" in value
  );
}
