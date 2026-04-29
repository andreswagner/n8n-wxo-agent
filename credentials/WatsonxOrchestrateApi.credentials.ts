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
      placeholder: "https://api.example.watson-orchestrate.ibm.com",
      description: "Base URL for the Watsonx Orchestrate API",
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
      description: "Bearer token or API key",
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
      url: "/v1/agents",
    },
  };
}
