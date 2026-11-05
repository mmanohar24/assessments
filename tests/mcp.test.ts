import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { describe, expect, it, vi } from "vitest";
import { buildMcpServer, type McpContext } from "@/lib/mcp/server";
import type { CreateChecklistInput } from "@/lib/validation";

// Sends real MCP messages through the real transport, with only the database faked.
async function call(context: McpContext, method: string, params: object = {}) {
  const server = buildMcpServer(context);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(
    new Request("https://chasely.test/api/mcp/x", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  return response.json();
}

function context() {
  const saveChecklist = vi.fn(async (input: CreateChecklistInput) => {
    void input;
    return { id: "abc-123", publicToken: "public-token" };
  });
  return { baseUrl: "https://chasely.test", saveChecklist };
}

const validArgs = {
  client_name: "Ravi",
  due_date: `${new Date().getUTCFullYear() + 1}-12-15`,
  items: [{ title: "Form 16", note: "Shows salary." }],
};

describe("MCP endpoint", () => {
  it("lists only create_checklist in step 1", async () => {
    const { result } = await call(context(), "tools/list");
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual(["create_checklist"]);
    expect(result.tools[0].inputSchema.properties.items.maxItems).toBe(40);
  });

  it("creates a checklist and replies with exactly what was made and both URLs", async () => {
    const ctx = context();
    const { result } = await call(ctx, "tools/call", {
      name: "create_checklist",
      arguments: validArgs,
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      id: "abc-123",
      item_count: 1,
      edit_url: "https://chasely.test/checklists/abc-123",
      client_url: "https://chasely.test/c/public-token",
    });
    expect(result.content[0].text).toContain("Created 1 checklist for Ravi");
    expect(result.content[0].text).toContain("reminders can't be sent");
    expect(ctx.saveChecklist).toHaveBeenCalledTimes(1);
  });

  it("returns plain-words errors for bad input and saves nothing", async () => {
    const ctx = context();
    const { result } = await call(ctx, "tools/call", {
      name: "create_checklist",
      arguments: { ...validArgs, due_date: "2020-01-01", items: [] },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Nothing was saved");
    expect(result.content[0].text).toContain("in the past");
    expect(result.content[0].text).toContain("at least 1 item");
    expect(ctx.saveChecklist).not.toHaveBeenCalled();
  });

  it("never passes a status through to the save step", async () => {
    const ctx = context();
    const { result } = await call(ctx, "tools/call", {
      name: "create_checklist",
      arguments: { ...validArgs, items: [{ title: "Form 16", note: "", status: "received" }] },
    });
    expect(result.isError).toBe(true);
    expect(ctx.saveChecklist).not.toHaveBeenCalled();
  });

  it("tells Claude not to blindly retry when the save fails", async () => {
    const ctx = context();
    ctx.saveChecklist.mockRejectedValueOnce(new Error("db down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = await call(ctx, "tools/call", {
      name: "create_checklist",
      arguments: validArgs,
    });
    log.mockRestore();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("check their dashboard");
    expect(result.content[0].text).not.toContain("db down");
  });

  it("handles an unknown tool in plain words", async () => {
    const { result } = await call(context(), "tools/call", { name: "delete_all", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("no tool called");
  });
});
