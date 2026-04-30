import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";
import { buildStructuredError, classifyProviderError, sanitizeDetails, type StructuredExecutionError } from "./errors";
import type { ExecutionRequest } from "./mappers";

export interface TransportClient {
  executeAgent(ctx: IExecuteFunctions, request: ExecutionRequest): Promise<IDataObject>;
  listAgents(ctx: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
}

/**
 * Paths align with @andreswagner/node-red-contrib-wxo-agent (WxOClient):
 * GET `{instance}/v1/orchestrate/agents`, POST `{instance}/v1/orchestrate/{id}/chat/completions`.
 * Some docs show `/api/v1/orchestrate/...` — if your tenant only exposes `/api`, set env or fork paths.
 */
function joinPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function listAgentsPath(): string {
  return `v1/orchestrate/agents`;
}

function chatCompletionsPath(agentId: string): string {
  const id = encodeURIComponent(agentId);
  return `v1/orchestrate/${id}/chat/completions`;
}

/** Maps node payload to wxo Chat Completion body (non-streaming JSON). */
export function toChatCompletionBody(payload: IDataObject): IDataObject {
  const input = payload.input;
  let content: string;
  if (input === null || input === undefined) {
    content = "";
  } else if (typeof input === "string") {
    content = input;
  } else if (typeof input === "number" || typeof input === "boolean") {
    content = String(input);
  } else {
    content = JSON.stringify(input);
  }

  return {
    messages: [{ role: "user", content }],
    stream: false,
  };
}

function normalizeAgentListResponse(response: IDataObject): IDataObject[] {
  if (Array.isArray(response)) {
    return response as IDataObject[];
  }
  const results = response.results;
  if (Array.isArray(results)) {
    return results as IDataObject[];
  }
  const agents = response.agents;
  if (Array.isArray(agents)) {
    return agents as IDataObject[];
  }
  return [];
}

export const transportClient: TransportClient = {
  async executeAgent(ctx, request) {
    try {
      const credentials = await ctx.getCredentials("watsonxOrchestrateApi");
      const baseUrl = String(credentials.baseUrl);

      const response = await ctx.helpers.httpRequestWithAuthentication.call(
        ctx,
        "watsonxOrchestrateApi",
        {
          method: "POST",
          url: joinPath(baseUrl, chatCompletionsPath(request.agentId)),
          body: toChatCompletionBody(request.payload),
          json: true,
          timeout: request.timeoutMs,
          headers: {
            "x-request-id": request.requestId ?? "",
          },
        },
      );

      return response as IDataObject;
    } catch (error) {
      throw toStructuredProviderError(error as IDataObject, request.agentId, request.requestId);
    }
  },

  async listAgents(ctx) {
    try {
      const credentials = await ctx.getCredentials("watsonxOrchestrateApi");
      const baseUrl = String(credentials.baseUrl);

      const response = (await ctx.helpers.httpRequestWithAuthentication.call(
        ctx,
        "watsonxOrchestrateApi",
        {
          method: "GET",
          url: joinPath(baseUrl, listAgentsPath()),
          json: true,
        },
      )) as IDataObject;

      const entries = normalizeAgentListResponse(response);

      return entries.map((agent) => ({
        name: String(agent.name ?? agent.display_name ?? agent.id ?? "Unnamed Agent"),
        value: String(agent.id ?? ""),
      })).filter((option) => option.value.length > 0);
    } catch {
      return [];
    }
  },
};

export function toStructuredProviderError(error: IDataObject, agentId?: string, requestId?: string): StructuredExecutionError {
  const classification = classifyProviderError(error);

  return buildStructuredError({
    category: classification.category,
    message: String(error.message ?? "Watsonx Orchestrate request failed"),
    retryable: classification.retryable,
    details: sanitizeDetails(error),
    agentId,
    requestId,
  });
}
