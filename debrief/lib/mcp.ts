// Exact callMCP pattern from DEBRIEF_SPEC.md Section 6.
export async function callMCP(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  token: string
): Promise<unknown> {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: crypto.randomUUID(),
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.result.content[0].text);
}
