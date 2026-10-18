import { NextRequest, NextResponse } from "next/server";

async function getGoogleAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth credentials: GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET are all required"
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Failed to refresh Google access token: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }

  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const { title, date, attendees, description } = await req.json();

  let token: string;
  try {
    token = await getGoogleAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Use all-day event format when only a date (no time) is supplied.
  const dateValue = (date as string | undefined)?.split("T")[0] ?? "";

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        description: description ?? "",
        start: { date: dateValue },
        end: { date: dateValue },
        attendees: Array.isArray(attendees)
          ? (attendees as string[]).map((email) => ({ email }))
          : [],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const errorText = JSON.stringify(data);
    return NextResponse.json({ error: errorText }, { status: res.status });
  }

  return NextResponse.json({ eventId: data.id });
}
