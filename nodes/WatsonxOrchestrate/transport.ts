import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";
import { buildStructuredError, classifyProviderError, sanitizeDetails, type StructuredExecutionError } from "./errors";
import type { ExecutionRequest } from "./mappers";

export interface TransportClient {
  executeAgent(ctx: IExecuteFunctions, request: ExecutionRequest): Promise<IDataObject>;
  listAgents(ctx: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
}

function joinPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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
          url: joinPath(baseUrl, `/v1/agents/${request.agentId}/execute`),
          body: request.payload,
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
          url: joinPath(baseUrl, "/v1/agents"),
          json: true,
        },
      )) as IDataObject;

      const entries = (response.agents as IDataObject[]) ?? [];

      return entries.map((agent) => ({
        name: String(agent.name ?? agent.id ?? "Unnamed Agent"),
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
