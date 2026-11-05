import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/lib/mcp/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function withinLimit(
  admin: ReturnType<typeof createAdminClient>,
  key: string,
  max: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_key: hashToken(key),
    p_max: max,
    p_window_seconds: 60,
  });
  // If the counter itself fails, let the request through instead of blocking everyone.
  if (error) {
    console.error("rate limit check failed:", error.message);
    return true;
  }
  return data === true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();

  const ip = request.headers.get("x-real-ip") ?? "unknown";
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
