import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/supabase/server";
import { McpUrlCard } from "./mcp-url-card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: token } = await supabase
    .from("mcp_tokens")
    .select("created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const createdLabel = token
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(token.created_at),
      )
    : null;

  return (
    <>
      <AppHeader />
      <main id="main" className="page">
        <div className="page-head">
          <div>
            <h1>Settings</h1>
            <p className="muted break">Logged in as {user.email}</p>
          </div>
        </div>
        <McpUrlCard createdLabel={createdLabel} />
      </main>
    </>
  );
}
