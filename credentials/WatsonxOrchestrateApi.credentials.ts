import type {
  IAuthenticateGeneric,
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IDataObject,
  IHttpRequestHelper,
  INodeProperties,
} from "n8n-workflow";
import {
  exchangeApiKeyForIamAccessToken,
  isLikelyIamAccessToken,
  normalizeTokenSecret,
} from "./ibm-iam";

export class WatsonxOrchestrateApi implements ICredentialType {
  name = "watsonxOrchestrateApi";

  displayName = "Watsonx Orchestrate API";

  documentationUrl = "https://www.ibm.com/docs/en/watsonx/watson-orchestrate";

  properties: INodeProperties[] = [
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "",
      required: true,
      placeholder: "https://api.REGION.watson-orchestrate.ibm.com/instances/TENANT_ID",
      description:
        "IBM **Service instance URL** from watsonx Orchestrate → Profile → Settings → API details. "
        + "Format: `https://<hostname>/instances/<tenant_id>` (IBM Cloud / AWS). "
        + "The node calls `/v1/orchestrate/agents` and `/v1/orchestrate/{agent}/chat/completions` on that URL (same as `@andreswagner/node-red-contrib-wxo-agent`).",
    },
    {
      displayName: "Token",
      name: "token",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      required: true,
      description:
        "IBM Cloud IAM **API key** or **access_token** (paste either—no `Bearer ` prefix). "
        + "If you paste an API key, n8n exchanges it for an IAM access token before each request (same as IBM’s "
        + "`grant_type=urn:ibm:params:oauth:grant-type:apikey` flow). "
        + "If you paste an access token (a JWT), it is sent as-is. "
        + "Access tokens expire (often ~1 hour); use an API key for hands-off refresh, or repeat the IAM exchange / "
        + "`ibmcloud iam oauth-tokens` and paste a new token.",
    },
    {
      displayName: "Resolved Access Token",
      name: "resolvedAccessToken",
      type: "hidden",
      default: "",
    },
    {
      displayName: "Environment",
      name: "environment",
      type: "options",
      options: [
        { name: "Production", value: "production" },
        { name: "Staging", value: "staging" },
      ],
      default: "production",
      description: "Environment label for this credential",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.resolvedAccessToken}}",
      },
    },
  };

  async preAuthentication(
    this: IHttpRequestHelper,
    credentials: ICredentialDataDecryptedObject,
  ): Promise<IDataObject> {
    const raw = normalizeTokenSecret(credentials.token);
    if (!raw) {
      return {};
    }
    if (isLikelyIamAccessToken(raw)) {
      return { resolvedAccessToken: raw };
    }
    const accessToken = await exchangeApiKeyForIamAccessToken(this.helpers.httpRequest, raw);
    return { resolvedAccessToken: accessToken };
  }

  test: ICredentialTestRequest = {
    request: {
      method: "GET",
      url: "={{$credentials.baseUrl}}/v1/orchestrate/agents",
    },
  };
}
