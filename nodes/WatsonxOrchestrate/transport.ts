import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";
import { buildStructuredError, classifyProviderError, sanitizeDetails, type StructuredExecutionError } from "./errors";
import type { ExecutionRequest } from "./mappers";
import { exchangeApiKeyForIamAccessToken, isLikelyIamAccessToken, normalizeTokenSecret } from "../../credentials/ibm-iam";

export interface TransportClient {
  executeAgent(ctx: IExecuteFunctions, request: ExecutionRequest): Promise<IDataObject>;
  listAgents(ctx: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
  debugAuthentication(ctx: IExecuteFunctions): Promise<IDataObject>;
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
            ...(request.threadId
              ? {
                "X-IBM-THREAD-ID": request.threadId,
                "X-THREAD-ID": request.threadId,
              }
              : {}),
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

  async debugAuthentication(ctx) {
    const diagnostics: IDataObject = {
      operation: "debugAuthentication",
      ok: false,
    };

    try {
      const credentials = await ctx.getCredentials("watsonxOrchestrateApi");
      const baseUrl = String(credentials.baseUrl ?? "");
      const source = normalizeTokenSecret(credentials.token);
      const inputKind = isLikelyIamAccessToken(source) ? "access_token_jwt" : "api_key_or_unknown";

      diagnostics.auth = {
        inputKind,
        inputMasked: maskSecret(source),
      };
      diagnostics.request = {
        method: "GET",
        url: joinPath(baseUrl, listAgentsPath()),
      };

      let resolvedAccessToken = source;
      if (!isLikelyIamAccessToken(source)) {
        try {
          resolvedAccessToken = await exchangeApiKeyForIamAccessToken(ctx.helpers.httpRequest, source);
          diagnostics.iamExchange = {
            ok: true,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          diagnostics.iamExchange = {
            ok: false,
            message,
          };
          diagnostics.error = sanitizeDetails({ message });
          return diagnostics;
        }
      } else {
        diagnostics.iamExchange = {
          ok: true,
          skipped: true,
          reason: "Token input already looks like an IAM JWT access token",
        };
      }

      const authorization = `Bearer ${resolvedAccessToken}`;
      diagnostics.auth = {
        ...(diagnostics.auth as IDataObject),
        resolvedKind: isLikelyIamAccessToken(resolvedAccessToken) ? "access_token_jwt" : "non_jwt",
        resolvedMasked: maskSecret(resolvedAccessToken),
        authorizationMasked: `Bearer ${maskSecret(resolvedAccessToken)}`,
        authorizationLength: authorization.length,
      };

      const response = await ctx.helpers.httpRequest({
        method: "GET",
        url: joinPath(baseUrl, listAgentsPath()),
        headers: {
          Authorization: authorization,
        },
        json: true,
        ignoreHttpStatusErrors: true,
        returnFullResponse: true,
      });

      const full = response as IDataObject;
      const statusCode = Number(full.statusCode ?? 0);
      const responseBody = full.body as IDataObject | unknown;
      const responseHeaders = (full.headers ?? {}) as IDataObject;

      diagnostics.http = {
        statusCode,
        ok: statusCode >= 200 && statusCode < 300,
        bodyPreview: previewJson(responseBody),
        headers: {
          "www-authenticate": responseHeaders["www-authenticate"],
          "x-request-id": responseHeaders["x-request-id"],
          date: responseHeaders.date,
        },
      };
      diagnostics.ok = statusCode >= 200 && statusCode < 300;

      if (!diagnostics.ok) {
        const classified = classifyProviderError({
          statusCode,
          message: typeof responseBody === "object" ? JSON.stringify(responseBody) : String(responseBody ?? ""),
        });
        diagnostics.classification = classified;
      }

      return diagnostics;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      diagnostics.error = sanitizeDetails({ message });
      return diagnostics;
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

function maskSecret(secret: string): string {
  const value = String(secret ?? "").trim();
  if (!value) return "<empty>";
  if (value.length <= 12) {
    return `${value.slice(0, 1)}***${value.slice(-1)}`;
  }
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function previewJson(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 1200);
  } catch {
    return String(value).slice(0, 1200);
  }
}
