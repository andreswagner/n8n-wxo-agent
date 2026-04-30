import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

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
        "IBM Cloud IAM **access token** (recommended): paste the `access_token` value only—no `Bearer ` prefix. "
        + "IBM documents that watsonx Orchestrate on IBM Cloud accepts an IAM API key or an IAM access token; "
        + "this field must be whatever you send after `Bearer ` (most teams use the access token from IAM). "
        + "To create a token from an API key, call IAM Identity Services: POST `https://iam.cloud.ibm.com/identity/token` "
        + "with `Content-Type: application/x-www-form-urlencoded` and body "
        + "`grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=YOUR_APIKEY`, then paste the JSON `access_token`. "
        + "Tokens expire (often ~1 hour); refresh by repeating the exchange or use `ibmcloud iam oauth-tokens` after login.",
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
        Authorization: "=Bearer {{$credentials.token}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      method: "GET",
      url: "={{$credentials.baseUrl.replace(/\/+$/, \"\")}}/v1/orchestrate/agents",
    },
  };
}
