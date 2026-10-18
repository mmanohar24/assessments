"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { ReviewGate } from "@/components/ReviewGate";
import type { MeetingExtraction } from "@/workflows/debrief";

// ── Types ──────────────────────────────────────────────────────────────────

type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface StatusResponse {
  runId: string;
  status: RunStatus;
}

interface StepDef {
  id: string;
  label: string;
  sublabel?: string;
}

type StepState = "pending" | "running" | "waiting" | "completed" | "failed" | "sleeping";

const STEPS: StepDef[] = [
  { id: "extract",   label: "Extract + Score Card",    sublabel: "Claude analysis via AI Gateway" },
  { id: "review",    label: "Review Gate",              sublabel: "Waiting for approval" },
  { id: "notion",    label: "Create Notion Tasks",      sublabel: "Writing to workspace" },
  { id: "calendar",  label: "Calendar Event",           sublabel: "Booking follow-up" },
  { id: "gmail",     label: "Gmail Draft",              sublabel: "Tone-aware recap" },
  { id: "slack",     label: "Slack Summary",            sublabel: "Posting to channel" },
  { id: "patterns",  label: "Pattern Detection",        sublabel: "Scanning meeting history" },
  { id: "sleep",     label: "48hr Follow-up",           sublabel: "Durable WDK sleep" },
  { id: "remind",    label: "Check & Remind",           sublabel: "Notion completion + nudge" },
];

function inferStepStates(
  runStatus: RunStatus | null,
  hasExtraction: boolean,
  approved: boolean
): Record<string, StepState> {
  const out: Record<string, StepState> = {};

  for (const step of STEPS) {
    out[step.id] = "pending";
  }

  if (!runStatus || runStatus === "pending") {
    out["extract"] = "running";
    return out;
  }

  if (runStatus === "failed" || runStatus === "cancelled") {
    return out;
  }

  if (!hasExtraction) {
    // still extracting
    out["extract"] = "running";
    return out;
  }

  // Extraction done
  out["extract"] = "completed";

  if (!approved) {
    // Waiting at review gate
    out["review"] = "waiting";
    return out;
  }

  out["review"] = "completed";

  if (runStatus === "completed") {
    // All done
    for (const step of STEPS) {
      if (step.id !== "sleep") out[step.id] = "completed";
      else out[step.id] = "completed";
    }
    return out;
  }

  // Dispatching: post-review steps are running
  out["notion"]    = "running";
  out["calendar"]  = "running";
  out["gmail"]     = "running";
  out["slack"]     = "running";
  out["patterns"]  = "running";
  out["sleep"]     = "sleeping";
  return out;
}

// ── Step Tracker ───────────────────────────────────────────────────────────

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <span className="text-[#00E87A]" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>
        ✓
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="text-[#FF5C5C]" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>
        ✕
      </span>
    );
  }
  if (state === "running") {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse-dot"
        style={{ backgroundColor: "#4D9EFF" }}
      />
    );
  }
  if (state === "waiting") {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse-dot"
        style={{ backgroundColor: "#F5A623" }}
      />
    );
  }
  if (state === "sleeping") {
    return (
      <span className="text-[#8A9A8A]" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>
        ◷
      </span>
    );
  }
  // pending
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: "#242824" }}
    />
  );
}

function stepLabelColor(state: StepState): string {
  if (state === "completed") return "#E8EDE8";
  if (state === "running")   return "#4D9EFF";
  if (state === "waiting")   return "#F5A623";
  if (state === "sleeping")  return "#8A9A8A";
  if (state === "failed")    return "#FF5C5C";
  return "#4A5A4A";
}

function StepTracker({
  stepStates,
}: {
  stepStates: Record<string, StepState>;
}) {
  return (
    <div
      className="rounded-[6px] border border-[#242824] p-5 flex-shrink-0"
      style={{ backgroundColor: "#111311", width: "220px" }}
    >
      <p
        className="uppercase tracking-[0.06em] text-[#8A9A8A] mb-4"
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
      >
        Pipeline
      </p>
      <ol className="space-y-3">
        {STEPS.map((step, idx) => {
          const state = stepStates[step.id] ?? "pending";
          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-0.5">
                <div className="w-4 h-4 flex items-center justify-center">
                  <StepIcon state={state} />
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="w-px mt-1"
                    style={{
                      height: "20px",
                      backgroundColor: state === "completed" ? "#2F3A30" : "#242824",
                    }}
                  />
                )}
              </div>
              <div>
                <p
                  className="leading-tight"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: "0.75rem",
                    fontWeight: state === "running" || state === "waiting" ? 600 : 400,
                    color: stepLabelColor(state),
                  }}
                >
                  {step.label}
                </p>
                {(state === "running" || state === "waiting" || state === "sleeping") && (
                  <p
                    className="mt-0.5 text-[#4A5A4A]"
                    style={{ fontFamily: "var(--font-inter)", fontSize: "0.7rem" }}
                  >
                    {step.sublabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: RunStatus | null }) {
  if (!status || status === "pending") {
    return (
      <span
        className="px-3 py-1 rounded-full uppercase tracking-[0.06em]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          backgroundColor: "#0A1F3D",
          color: "#4D9EFF",
        }}
      >
        Starting
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        className="flex items-center gap-2 px-3 py-1 rounded-full uppercase tracking-[0.06em]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          backgroundColor: "#003D22",
          color: "#00E87A",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: "#00E87A" }} />
        Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span
        className="px-3 py-1 rounded-full uppercase tracking-[0.06em]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          backgroundColor: "#003D22",
          color: "#00E87A",
        }}
      >
        Complete
      </span>
    );
  }
  if (status === "failed" || status === "cancelled") {
    return (
      <span
        className="px-3 py-1 rounded-full uppercase tracking-[0.06em]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          backgroundColor: "#2A0A0A",
          color: "#FF5C5C",
        }}
      >
        {status}
      </span>
    );
  }
  return null;
}

// ── Results Panel ──────────────────────────────────────────────────────────

function ResultCard({
  label,
  statusText,
  previewLines,
  linkHref,
  linkLabel,
  skipped,
}: {
  label: string;
  statusText: string;
  previewLines?: string[];
  linkHref?: string;
  linkLabel?: string;
  skipped?: boolean;
}) {
  return (
    <div
      className="rounded-[6px] flex flex-col gap-3 p-4"
      style={{ backgroundColor: "#1A1F1A", border: "1px solid #1E3A1E" }}
    >
      <p
        className="uppercase tracking-[0.06em]"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          color: skipped ? "#8A9A8A" : "#00E87A",
        }}
      >
        {skipped ? "— " : "✓ "}
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.8rem",
          color: skipped ? "#8A9A8A" : "#E8EDE8",
        }}
      >
        {statusText}
      </p>
      {previewLines && previewLines.length > 0 && (
        <ul className="space-y-1">
          {previewLines.map((line, i) => (
            <li
              key={i}
              className="text-[#8A9A8A]"
              style={{ fontFamily: "var(--font-inter)", fontSize: "0.8rem" }}
            >
              · {line}
            </li>
          ))}
        </ul>
      )}
      {linkHref && linkLabel && (
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-block self-start"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.7rem",
            fontWeight: 500,
            color: "#F5A623",
            border: "1px solid #F5A623",
            borderRadius: "4px",
            padding: "6px 12px",
            textDecoration: "none",
          }}
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}

function ResultsPanel({
  extraction,
  meetingTitle,
}: {
  extraction: MeetingExtraction;
  meetingTitle: string;
}) {
  const taskCount = extraction.actionItems.length;
  const previewTasks = extraction.actionItems.slice(0, 3).map((item) => item.title);
  const emailSubject = `Meeting Recap: ${meetingTitle}`;
  const slackPreview = extraction.summary.split(/(?<=[.!?])\s/)[0] ?? extraction.summary;
  const hasFollowUp = !!extraction.followUpDate;

  return (
    <div className="rounded-[6px] border border-[#242824] p-5" style={{ backgroundColor: "#161916" }}>
      <p
        className="uppercase tracking-[0.06em] text-[#8A9A8A] mb-4"
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
      >
        Results
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ResultCard
          label="Notion Tasks"
          statusText={`${taskCount} task${taskCount !== 1 ? "s" : ""} created`}
          previewLines={previewTasks}
          linkHref="https://www.notion.so/mmanohar24/Debrief-Hackathon-34eec61d6c2d8037acc2c7090a1907b5"
          linkLabel="View in Notion →"
        />
        <ResultCard
          label="Gmail Draft"
          statusText="Draft created"
          previewLines={[emailSubject]}
          linkHref="https://mail.google.com/mail/u/0/#drafts"
          linkLabel="Open in Gmail →"
        />
        <ResultCard
          label="Slack"
          statusText="Posted to channel"
          previewLines={[slackPreview]}
          linkHref="https://app.slack.com"
          linkLabel="View in Slack →"
        />
        {hasFollowUp ? (
          <ResultCard
            label="Calendar"
            statusText="Event created"
            previewLines={[`Follow-up: ${extraction.followUpDate}`]}
          />
        ) : (
          <ResultCard
            label="Calendar"
            statusText="Skipped — no follow-up date"
            skipped
          />
        )}
      </div>
    </div>
  );
}

// ── Dispatched state card ──────────────────────────────────────────────────

function DispatchedCard({ extraction }: { extraction: MeetingExtraction }) {
  return (
    <div className="rounded-[6px] border border-[#242824] p-5" style={{ backgroundColor: "#161916" }}>
      <p
        className="uppercase tracking-[0.06em] text-[#00E87A] mb-4"
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
      >
        Dispatched
      </p>
      <p className="text-[#8A9A8A] mb-4" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
        {extraction.summary}
      </p>
      {extraction.recurringTopics.length > 0 && (
        <div
          className="rounded-[4px] border border-[#2A1E00] px-4 py-3 mt-3"
          style={{ backgroundColor: "#2A1E00" }}
        >
          <p
            className="uppercase tracking-[0.06em] text-[#F5A623] mb-1"
            style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
          >
            ⚠ Recurring Topics Detected
          </p>
          <ul className="space-y-1">
            {extraction.recurringTopics.map((topic, i) => (
              <li
                key={i}
                className="text-[#F5A623]"
                style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="mt-4 rounded-[4px] border border-[#242824] px-4 py-3"
        style={{ backgroundColor: "#0D0F0E" }}
      >
        <p
          className="uppercase tracking-[0.06em] text-[#8A9A8A] mb-1"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
        >
          ◷ 48hr Follow-up Scheduled
        </p>
        <p className="text-[#4A5A4A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.8rem" }}>
          Debrief will wake up in 48 hours, check Notion for incomplete tasks, and send reminders.
        </p>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

function RunDashboard() {
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const runId = params.runId;
  const hookId = searchParams.get("h") ?? "";

  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [extraction, setExtraction] = useState<MeetingExtraction | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll workflow status
  useEffect(() => {
    if (!runId) return;

    async function poll() {
      try {
        const res = await fetch(`/api/workflow-status/${runId}`);
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        setRunStatus(data.status);

        if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // ignore transient errors
      }
    }

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [runId]);

  // Poll review store until extraction is ready
  useEffect(() => {
    if (!hookId || extraction || approved) return;

    async function fetchExtraction() {
      try {
        const res = await fetch(`/api/review/store?runId=${hookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.extraction) {
          setExtraction(data.extraction as MeetingExtraction);
          if (data.meetingTitle) setMeetingTitle(data.meetingTitle as string);
        }
      } catch {
        // ignore
      }
    }

    fetchExtraction();
    const t = setInterval(fetchExtraction, 3000);
    return () => clearInterval(t);
  }, [hookId, extraction, approved]);

  const stepStates = inferStepStates(runStatus, !!extraction, approved);
  const showReviewGate = !!extraction && !approved && runStatus === "running";
  const showDispatched = approved && runStatus !== null;
  const showCompleted = runStatus === "completed";

  return (
    <div className="min-h-screen bg-[#0D0F0E]">
      {/* Top bar */}
      <div className="border-b border-[#242824]" style={{ backgroundColor: "#111311" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              className="text-[#00E87A]"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              DEBRIEF
            </span>
            <span className="text-[#242824]" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>
              /
            </span>
            <span
              className="text-[#4A5A4A] font-mono truncate max-w-[200px]"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}
            >
              {runId}
            </span>
          </div>
          <RunStatusBadge status={runStatus} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8 items-start">
        {/* Left: step tracker (fixed width, sticky) */}
        <div className="sticky top-8">
          <StepTracker stepStates={stepStates} />
        </div>

        {/* Right: content area */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Error state */}
          {error && (
            <div
              className="rounded-[6px] border border-[#2A0A0A] px-4 py-3"
              style={{ backgroundColor: "#2A0A0A" }}
            >
              <p className="text-[#FF5C5C]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                {error}
              </p>
            </div>
          )}

          {/* Extracting state */}
          {!extraction && runStatus !== "failed" && runStatus !== "cancelled" && (
            <div
              className="rounded-[6px] border border-[#242824] px-5 py-6"
              style={{ backgroundColor: "#111311" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ backgroundColor: "#4D9EFF" }}
                />
                <p
                  className="uppercase tracking-[0.06em] text-[#4D9EFF]"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
                >
                  Analysing Transcript
                </p>
              </div>
              <p className="text-[#4A5A4A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                Claude is extracting action items, decisions, and scoring meeting efficiency…
              </p>
              <div
                className="mt-4 p-4 rounded-[6px] font-mono text-[#00E87A]"
                style={{ backgroundColor: "#0D0F0E", fontSize: "0.8125rem" }}
              >
                <span>→ extract-meeting-data</span>
                <span className="animate-blink ml-1">▋</span>
              </div>
            </div>
          )}

          {/* Failed / cancelled */}
          {(runStatus === "failed" || runStatus === "cancelled") && (
            <div
              className="rounded-[6px] border border-[#2A0A0A] px-5 py-5"
              style={{ backgroundColor: "#2A0A0A" }}
            >
              <p
                className="uppercase tracking-[0.06em] text-[#FF5C5C] mb-2"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
              >
                Workflow {runStatus}
              </p>
              <p className="text-[#8A9A8A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                The workflow run encountered an error. Check your API keys and workflow logs.
              </p>
            </div>
          )}

          {/* Score card — shown once extraction is available */}
          {extraction && (
            <ScoreCard
              score={extraction.meetingEfficiencyScore}
              rationale={extraction.scoreRationale}
              decisionCount={extraction.decisions.length}
              actionItemCount={extraction.actionItems.length}
            />
          )}

          {/* Review gate — shown when paused and not yet approved */}
          {showReviewGate && (
            <ReviewGate
              hookId={hookId}
              extraction={extraction!}
              onApproved={() => setApproved(true)}
            />
          )}

          {/* Dispatched card — shown after approval */}
          {showDispatched && extraction && !showCompleted && (
            <DispatchedCard extraction={extraction} />
          )}

          {/* Results panel — shown after approval */}
          {showDispatched && extraction && !showCompleted && (
            <ResultsPanel extraction={extraction} meetingTitle={meetingTitle} />
          )}

          {/* Completed card */}
          {showCompleted && extraction && (
            <div
              className="rounded-[6px] border border-[#2F3A30] px-5 py-5"
              style={{ backgroundColor: "#161916" }}
            >
              <p
                className="uppercase tracking-[0.06em] text-[#00E87A] mb-2"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
              >
                ✓ Workflow Complete
              </p>
              <p className="text-[#8A9A8A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                All steps dispatched. Notion tasks created, calendar event booked, email drafted, Slack posted.
                The 48-hour follow-up check is scheduled.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────

export default function RunPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0F0E] flex items-center justify-center">
          <span
            className="text-[#4A5A4A]"
            style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.875rem" }}
          >
            Loading run…
          </span>
        </div>
      }
    >
      <RunDashboard />
    </Suspense>
  );
}
