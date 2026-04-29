import type { IDataObject } from "n8n-workflow";

export type ErrorCategory =
  | "auth_error"
  | "agent_discovery_error"
  | "validation_error"
  | "execution_error"
  | "timeout_error"
  | "rate_limit_error";

export interface StructuredExecutionError {
  errorCategory: ErrorCategory;
  message: string;
  retryable: boolean;
  details?: IDataObject;
  metadata: {
    status: "error";
    agentId?: string;
    requestId?: string;
  };
}

export interface ClassificationResult {
  category: ErrorCategory;
  retryable: boolean;
}

const SECRET_PATTERNS = [/bearer\s+[a-z0-9._-]+/gi, /token["'=: ]+[a-z0-9._-]+/gi];

export function sanitizeDetails(value: unknown): IDataObject | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const json = JSON.stringify(value, (_, current) => {
    if (typeof current === "string") {
      let sanitized = current;
      for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      }
      return sanitized;
    }

    return current;
  });

  return JSON.parse(json) as IDataObject;
}

export function classifyProviderError(error: IDataObject): ClassificationResult {
  const statusCode = Number(error.statusCode ?? error.httpCode ?? 0);
  const code = String(error.code ?? "").toUpperCase();

  if (statusCode === 401 || statusCode === 403) {
    return { category: "auth_error", retryable: false };
  }

  if (statusCode === 404) {
    return { category: "agent_discovery_error", retryable: false };
  }

  if (statusCode === 429) {
    return { category: "rate_limit_error", retryable: true };
  }

  if (code.includes("TIMEOUT") || code.includes("TIMEDOUT") || statusCode === 408 || statusCode === 504) {
    return { category: "timeout_error", retryable: true };
  }

  if (statusCode >= 500) {
    return { category: "execution_error", retryable: true };
  }

  return { category: "execution_error", retryable: false };
}

export function buildStructuredError(params: {
  category: ErrorCategory;
  message: string;
  retryable: boolean;
  details?: IDataObject;
  agentId?: string;
  requestId?: string;
}): StructuredExecutionError {
  return {
    errorCategory: params.category,
    message: params.message,
    retryable: params.retryable,
    details: params.details,
    metadata: {
      status: "error",
      agentId: params.agentId,
      requestId: params.requestId,
    },
  };
}
