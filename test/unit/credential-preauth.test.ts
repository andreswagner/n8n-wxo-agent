import { describe, expect, it, vi } from "vitest";
import type { IHttpRequestHelper } from "n8n-workflow";
import { WatsonxOrchestrateApi } from "../../credentials/WatsonxOrchestrateApi.credentials";

describe("WatsonxOrchestrateApi preAuthentication", () => {
  it("passes through JWT token without IAM exchange", async () => {
    const credential = new WatsonxOrchestrateApi();
    const httpRequest = vi.fn();
    const helperContext = {
      helpers: {
        httpRequest,
      },
    } as unknown as IHttpRequestHelper;

    const output = await credential.preAuthentication.call(helperContext, {
      token: "  a.b.c  ",
    });

    expect(output).toEqual({ resolvedAccessToken: "a.b.c" });
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it("exchanges API key for IAM access token", async () => {
    const credential = new WatsonxOrchestrateApi();
    const httpRequest = vi.fn().mockResolvedValue({
      access_token: "jwt.from.iam",
    });
    const helperContext = {
      helpers: {
        httpRequest,
      },
    } as unknown as IHttpRequestHelper;

    const output = await credential.preAuthentication.call(helperContext, {
      token: "my-api-key",
    });

    expect(output).toEqual({ resolvedAccessToken: "jwt.from.iam" });
    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://iam.cloud.ibm.com/identity/token",
      }),
    );
  });

  it("auth header uses resolvedAccessToken field", () => {
    const credential = new WatsonxOrchestrateApi();
    expect(credential.authenticate).toMatchObject({
      type: "generic",
      properties: {
        headers: {
          Authorization: "=Bearer {{$credentials.resolvedAccessToken}}",
        },
      },
    });
  });

  it("marks resolved access token as expirable for n8n pre-auth refresh", () => {
    const credential = new WatsonxOrchestrateApi();
    const resolved = credential.properties.find((p) => p.name === "resolvedAccessToken");
    expect(resolved).toBeDefined();
    expect(resolved?.type).toBe("hidden");
    expect(resolved?.typeOptions).toMatchObject({ expirable: true });
  });
});
