import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/lib/mcp/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { hashToken, newToken } from "@/lib/tokens";

const MAX_BODY_BYTES = 256 * 1024;
const USER_LIMIT_PER_MINUTE = 60;
// Claude's connector traffic can share IP addresses, so this is only a guard against
// someone guessing URLs from one place.
const IP_LIMIT_PER_MINUTE = 300;

function rpcError(status: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();

  const ip = clientIp(request.headers);
  if (!(await withinLimit(admin, `mcp:ip:${ip}`, IP_LIMIT_PER_MINUTE))) {
    return rpcError(429, "Too many requests. Wait a minute and try again.");
  }

  const { data: owner, error: ownerError } = await admin
    .from("mcp_tokens")
    .select("user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (ownerError) {
    console.error("mcp token lookup failed:", ownerError.message);
    return rpcError(503, "Chasely is having trouble right now. Try again in a minute.");
  }
  if (!owner) {
    return rpcError(
      401,
      "This Chasely MCP URL isn't valid. It may have been regenerated. Get a new one from Settings in Chasely.",
    );
  }

  if (!(await withinLimit(admin, `mcp:user:${owner.user_id}`, USER_LIMIT_PER_MINUTE))) {
    return rpcError(429, "Too many requests. Wait a minute and try again.");
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");

  const server = buildMcpServer({
    baseUrl,
    saveChecklist: async (input) => {
      const publicToken = newToken();
      const { data, error } = await admin.rpc("create_checklist_with_items", {
        p_owner_id: owner.user_id,
        p_client_name: input.client_name,
        p_client_email: input.client_email,
        p_due_date: input.due_date,
        p_public_token: publicToken,
        p_items: input.items,
      });
      if (error) throw new Error(error.message);
      return { id: data as string, publicToken };
    },
    // The service key skips row level security, so every read filters by owner here.
    listChecklists: async () => {
      const { data, error } = await admin
        .from("checklists")
        .select("id, client_name, due_date, is_closed, items(status)")
        .eq("owner_id", owner.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    getChecklist: async (id) => {
      const { data, error } = await admin
        .from("checklists")
        .select(
          "id, client_name, client_email, due_date, is_closed, public_token, last_reminder_at, items(title, note, status, client_note, position)",
        )
        .eq("id", id)
        .eq("owner_id", owner.user_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // No sessions: a fresh server for each request, which suits serverless hosting.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MAX_BODY_BYTES,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

// This endpoint keeps no open connections, so only POST is supported.
function methodNotAllowed() {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "This endpoint only accepts POST." },
      id: null,
    }),
    { status: 405, headers: { Allow: "POST", "Content-Type": "application/json" } },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
