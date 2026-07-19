/**
 * Mock for the `ai` package — avoids ESM import issues in Jest.
 * The `tool()` wrapper is a pass-through: it returns the execute function as-is
 * so tests can call tool.execute!({...}) directly.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tool(config: any): any {
  return {
    description: config.description,
    inputSchema: config.inputSchema,
    execute: config.execute,
  };
}
