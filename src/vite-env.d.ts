/// <reference types="vite/client" />

interface WebMCPTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: Record<string, unknown>): unknown | Promise<unknown>;
}

interface Document {
  readonly modelContext?: {
    registerTool(tool: WebMCPTool): void | Promise<void>;
  };
}
