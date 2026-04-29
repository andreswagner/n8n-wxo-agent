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
  outputMode: "full" | "concise";
}): Promise<INodeExecutionData> {
  const input = params.context.getNodeParameter("input", params.itemIndex, null) as unknown;
  const timeoutMs = params.context.getNodeParameter("timeoutMs", params.itemIndex, 30000) as number;
  const requestId = `wxo-${Date.now()}-${params.itemIndex}`;
  const started = Date.now();

  const normalized = normalizeInput(input);
  const request = buildExecutionRequest({
    agentId: params.resolvedAgentId,
    normalized,
    timeoutMs,
    requestId,
  });

  const raw = await transportClient.executeAgent(params.context, request);
  const durationMs = Date.now() - started;

  const envelope = shapeSuccess({
    raw,
    agentId: params.resolvedAgentId,
    durationMs,
    requestId,
    outputMode: params.outputMode,
  });

  return {
    json: envelope as unknown as IDataObject,
  };
}

export class WatsonxOrchestrate implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Watsonx Orchestrate",
    name: "watsonxOrchestrate",
    icon: "file:watsonxOrchestrate.svg",
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

    if (operation !== "executeAgent") {
      throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
    }

    const outputMode = this.getNodeParameter("outputMode", 0, "full") as "full" | "concise";
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
