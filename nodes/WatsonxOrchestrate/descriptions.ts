import type { INodeProperties } from "n8n-workflow";

export const nodeProperties: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    default: "executeAgent",
    options: [
      { name: "Execute Agent", value: "executeAgent" },
      { name: "Debug Authentication", value: "debugAuthentication" },
    ],
  },
  {
    displayName: "Selection Mode",
    name: "agentSelectionMode",
    type: "options",
    default: "list",
    description: "Use discovery list when available, with manual fallback always available",
    options: [
      { name: "List", value: "list" },
      { name: "Manual", value: "manual" },
    ],
    displayOptions: {
      show: {
        operation: ["executeAgent"],
      },
    },
  },
  {
    displayName: "Agent",
    name: "agentIdFromList",
    type: "options",
    default: "",
    required: true,
    typeOptions: {
      loadOptionsMethod: "loadAgents",
    },
    displayOptions: {
      show: {
        operation: ["executeAgent"],
        agentSelectionMode: ["list"],
      },
    },
    description: "Select an available agent discovered from Watsonx Orchestrate",
  },
  {
    displayName: "Agent ID",
    name: "agentIdManual",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        operation: ["executeAgent"],
        agentSelectionMode: ["manual"],
      },
    },
    description: "Manual fallback if agent discovery is unavailable",
  },
  {
    displayName: "Input",
    name: "input",
    type: "json",
    default: "={{ { \"prompt\": \"Hello\" } }}",
    required: true,
    description: "Execution payload. Supports text, numbers, booleans, arrays, objects, and null",
    displayOptions: {
      show: {
        operation: ["executeAgent"],
      },
    },
  },
  {
    displayName: "Timeout (ms)",
    name: "timeoutMs",
    type: "number",
    default: 30000,
    description: "Per-item request timeout (1000-120000)",
    displayOptions: {
      show: {
        operation: ["executeAgent"],
      },
    },
  },
  {
    displayName: "Output Mode",
    name: "outputMode",
    type: "options",
    default: "full",
    options: [
      { name: "Full (response + raw)", value: "full" },
      { name: "Concise (response only)", value: "concise" },
    ],
    description: "Choose whether to include full raw upstream payload",
    displayOptions: {
      show: {
        operation: ["executeAgent"],
      },
    },
  },
];
