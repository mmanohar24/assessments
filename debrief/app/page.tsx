"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Demo content ──────────────────────────────────────────────────────────────

const DEMO_TITLE = "Q2 Planning Meeting";

const DEMO_TRANSCRIPT = `Q2 Planning Meeting — May 4, 2026
Attendees: Sarah (PM), Mike (Engineering), Alex (Design), Jordan (Marketing), Chris (Finance)

[00:00] Sarah: Alright everyone, let's get started. We have a lot to cover — feature scoping for Q2, the launch timeline, and we need to finally resolve the budget question that has been sitting open for three meetings now.

[00:45] Chris: Before we dive in — I still have not received sign-off from the finance committee on the expanded budget. This is the third meeting I'm flagging it and it's starting to block other decisions.

[01:15] Sarah: Noted. We'll come back to that. Mike, where are we on the mobile auth refactor?

[01:30] Mike: Backend work is done. Alex's designs are approved, so we can start front-end this sprint. Two weeks if we don't hit scope creep.

[02:00] Alex: Designs are final. I'll send the updated Figma link to engineering today.

[02:20] Sarah: Good. Decision — mobile auth refactor is in Q2. Mike, assign an owner by end of week.

[02:35] Mike: I'll assign it to Jamie. Confirmed by Friday.

[03:00] Jordan: I need the feature list locked by May 8th to start the launch campaign. If anything slips past that, we lose the press window we've been building toward.

[03:30] Sarah: May 8th feature lock is confirmed. That's a decision. Chris — can we proceed with planned spend and get retroactive approval on the budget?

[04:00] Chris: I've raised this with finance three times and I'm not getting a response. We need to escalate to VP level. The budget approval is blocking the contractor work on the data pipeline.

[04:30] Sarah: Agreed. I'll escalate the budget approval to VP Finance by tomorrow — that's on me.

[04:45] Mike: The data pipeline is connected to the analytics feature Jordan needs for launch. If contractors can't start, analytics may need to be de-scoped from Q2.

[05:00] Jordan: Analytics was in the launch deck. That would be a significant change.

[05:15] Sarah: Provisional decision — analytics stays in Q2 scope. If budget isn't resolved by May 12th, we de-scope it and Jordan adjusts launch messaging. Jordan, draft two versions of launch copy — one with analytics, one without.

[05:45] Jordan: I'll have both versions ready by May 7th.

[06:00] Alex: I want to flag the onboarding flow. We got user research back showing a 40% drop-off at step 3. I'd like to include a quick fix in Q2.

[06:20] Sarah: Engineering estimate?

[06:30] Mike: Three days if Alex gives me a scoped design.

[06:45] Sarah: Decision — we include the onboarding fix. Alex, deliver a scoped design by May 7th. Mike, schedule it in.

[07:00] Chris: The vendor contract for analytics infrastructure is up for renewal May 16th. Someone needs to sign off. It's $45k annually.

[07:20] Sarah: Chris, send the contract to me and Jordan today. We'll review and decide on renewal.

[07:35] Chris: Will do.

[07:45] Jordan: What's the confirmed launch date? I keep hearing May 15th but nothing has been formally locked.

[08:00] Sarah: Final decision — launch date is May 15th. That's locked. Everyone align to that.

[08:15] Mike: As long as mobile auth is complete by May 8th for QA buffer, we're good.

[08:20] Sarah: Explicit milestone — mobile auth done by May 8th. Mike owns it.

[08:30] Sarah: Recap: Alex sends Figma link today. Mike assigns mobile auth to Jamie by Friday. Sarah escalates budget to VP Finance tomorrow. Jordan drafts two launch messaging versions by May 7th. Alex delivers scoped onboarding design by May 7th. Chris sends vendor contract to Sarah and Jordan today. Follow-up call May 14th. Any questions?

[09:00] Mike: Just confirming — data pipeline contractor work is still blocked pending budget resolution?

[09:10] Sarah: Correct. That's the one open dependency. Let's close there.

[09:20] Jordan: Before we wrap — can we schedule a follow-up meeting for May 15th, 2026 to review launch readiness across all teams?

[09:25] Sarah: Agreed. Let's put a follow-up meeting on the calendar for May 15, 2026. I'll send the invite.`;

// ── Shared style tokens ────────────────────────────────────────────────────────

const mono = { fontFamily: "var(--font-jetbrains-mono)" } as const;
const sans = { fontFamily: "var(--font-inter)" } as const;

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: "0.7rem",
  fontWeight: 500,
  letterSpacing: "0.06em",
  color: "#8A9A8A",
  textTransform: "uppercase",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const [transcriptFocused, setTranscriptFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/process-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle,
          transcript,
          attendees: [],
          recipientEmail: recipientEmail || undefined,
          slackChannelId: process.env.NEXT_PUBLIC_DEFAULT_SLACK_CHANNEL_ID,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const { runId, hookId } = await res.json();
      router.push(`/run/${runId}?h=${hookId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const inputBorder = (focused: boolean) =>
    `1px solid ${focused ? "#2F3A30" : "#242824"}`;

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#0D0F0E", padding: "48px 24px 80px" }}
    >
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span
              style={{
                ...mono,
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#00E87A",
              }}
            >
              DEBRIEF
            </span>
            <span
              style={{
                ...mono,
                fontSize: "0.7rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                color: "#4A5A4A",
                textTransform: "uppercase",
                alignSelf: "flex-end",
                marginBottom: "4px",
              }}
            >
              v0.1
            </span>
          </div>
          <p
            style={{
              ...sans,
              fontSize: "0.9375rem",
              color: "#8A9A8A",
              lineHeight: 1.6,
            }}
          >
            Your meeting ends. Debrief handles everything else.
          </p>
          <div
            style={{
              marginTop: "24px",
              height: "1px",
              backgroundColor: "#242824",
            }}
          />
        </header>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Meeting Title */}
            <div>
              <label
                htmlFor="meetingTitle"
                style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
              >
                Meeting Title
              </label>
              <input
                id="meetingTitle"
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                placeholder="e.g. Q2 Planning Meeting"
                required
                style={{
                  ...sans,
                  display: "block",
                  width: "100%",
                  backgroundColor: "#111311",
                  color: "#E8EDE8",
                  border: inputBorder(titleFocused),
                  borderRadius: "4px",
                  padding: "10px 14px",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 120ms ease-out",
                }}
              />
            </div>

            {/* Transcript */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label htmlFor="transcript" style={labelStyle}>
                  Transcript
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <DemoButton
                    label="Copy Demo Title"
                    onClick={() => setMeetingTitle(DEMO_TITLE)}
                  />
                  <DemoButton
                    label="Copy Demo Transcript"
                    onClick={() => setTranscript(DEMO_TRANSCRIPT)}
                  />
                </div>
              </div>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onFocus={() => setTranscriptFocused(true)}
                onBlur={() => setTranscriptFocused(false)}
                placeholder="Paste your meeting transcript here…"
                required
                rows={16}
                style={{
                  ...sans,
                  display: "block",
                  width: "100%",
                  backgroundColor: "#111311",
                  color: "#E8EDE8",
                  border: inputBorder(transcriptFocused),
                  borderRadius: "4px",
                  padding: "10px 14px",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  transition: "border-color 120ms ease-out",
                  minHeight: "300px",
                }}
              />
              <p
                style={{
                  ...sans,
                  fontSize: "0.75rem",
                  color: "#4A5A4A",
                  marginTop: "6px",
                }}
              >
                Paste a raw transcript or use the demo buttons to try a pre-loaded example.
              </p>
            </div>

            {/* Recipient Email */}
            <div>
              <label
                htmlFor="recipientEmail"
                style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
              >
                Recipient Email
                <span style={{ ...mono, color: "#4A5A4A", marginLeft: "8px", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="e.g. team@company.com"
                style={{
                  ...sans,
                  display: "block",
                  width: "100%",
                  backgroundColor: "#111311",
                  color: "#E8EDE8",
                  border: inputBorder(emailFocused),
                  borderRadius: "4px",
                  padding: "10px 14px",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 120ms ease-out",
                }}
              />
              <p style={{ ...sans, fontSize: "0.75rem", color: "#4A5A4A", marginTop: "6px" }}>
                A Gmail draft recap will be created for this address.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  backgroundColor: "#2A0A0A",
                  border: "1px solid #3D1010",
                  borderRadius: "4px",
                  padding: "10px 14px",
                }}
              >
                <p style={{ ...sans, fontSize: "0.875rem", color: "#FF5C5C", margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...mono,
                display: "block",
                width: "100%",
                padding: "14px 20px",
                backgroundColor: loading ? "#00A855" : "#00E87A",
                color: "#001A0D",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.8 : 1,
                transition: "background-color 120ms ease-out",
                marginTop: "4px",
              }}
            >
              {loading ? "Starting Workflow…" : "Run Debrief →"}
            </button>

          </div>
        </form>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer style={{ marginTop: "48px", borderTop: "1px solid #242824", paddingTop: "24px" }}>
          <p
            style={{
              ...mono,
              fontSize: "0.7rem",
              color: "#4A5A4A",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Powered by Vercel Workflow SDK · Anthropic Claude · 5 MCP Integrations
          </p>
        </footer>

      </div>
    </main>
  );
}

// ── DemoButton ─────────────────────────────────────────────────────────────────

function DemoButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "var(--font-jetbrains-mono)",
        fontSize: "0.65rem",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: "#F5A623",
        backgroundColor: hovered ? "rgba(245, 166, 35, 0.10)" : "transparent",
        border: "1px solid #F5A623",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        transition: "background-color 120ms ease-out",
        whiteSpace: "nowrap",
      }}
    >
      ✦ {label}
    </button>
  );
}
