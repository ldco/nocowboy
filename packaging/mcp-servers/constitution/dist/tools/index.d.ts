export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    handler: (args: Record<string, unknown>) => Promise<string>;
}
export declare const tools: ToolDefinition[];
