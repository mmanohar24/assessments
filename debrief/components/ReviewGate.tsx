"use client";

import { useState } from "react";
import type { MeetingExtraction } from "@/workflows/debrief";

interface ReviewGateProps {
  hookId: string;
  extraction: MeetingExtraction;
  onApproved: () => void;
}

type ActionItem = MeetingExtraction["actionItems"][number];
type Priority = "high" | "medium" | "low";

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  high: { bg: "#2A0A0A", text: "#FF5C5C" },
  medium: { bg: "#2A1E00", text: "#F5A623" },
  low: { bg: "#003D22", text: "#00E87A" },
};

function PriorityBadge({ priority, onChange }: { priority: Priority; onChange: (p: Priority) => void }) {
  const [open, setOpen] = useState(false);
  const colors = PRIORITY_COLORS[priority];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-0.5 rounded-[2px] uppercase tracking-[0.06em] cursor-pointer"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: "0.7rem",
          fontWeight: 500,
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {priority}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-10 rounded-[4px] border border-[#2F3A30] overflow-hidden"
          style={{ backgroundColor: "#1C1F1C", minWidth: "80px" }}
        >
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 uppercase tracking-[0.06em] hover:bg-[#242824]"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "0.7rem",
                fontWeight: 500,
                color: PRIORITY_COLORS[p].text,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewGate({ hookId, extraction, onApproved }: ReviewGateProps) {
  const [items, setItems] = useState<ActionItem[]>(extraction.actionItems);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(idx: number, patch: Partial<ActionItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { title: "", owner: "", dueDate: "", priority: "medium" },
    ]);
  }

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: hookId,
          extraction: { ...extraction, actionItems: items },
        }),
      });
      if (!res.ok) throw new Error(`Approval failed: ${res.status}`);
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[6px] border border-[#2F3A30] overflow-hidden" style={{ backgroundColor: "#161916" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#242824]">
        <p
          className="uppercase tracking-[0.06em] text-[#00E87A] mb-1"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
        >
          Review Before Dispatch
        </p>
        <p className="text-[#8A9A8A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
          Edit anything below. Approve to dispatch to all destinations.
        </p>
      </div>

      <div className="px-5 py-4 space-y-6">
        {/* Action Items */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p
              className="uppercase tracking-[0.06em] text-[#8A9A8A]"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
            >
              Action Items ({items.length})
            </p>
            <button
              type="button"
              onClick={addItem}
              className="uppercase tracking-[0.06em] text-[#4D9EFF] hover:text-[#E8EDE8] transition-colors duration-[120ms]"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-[4px] border border-[#242824] px-3 py-3 hover:border-[#2F3A30] transition-colors duration-[120ms]"
                style={{ backgroundColor: "#111311" }}
              >
                {/* Title row */}
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                  placeholder="Action item description"
                  className="w-full bg-transparent outline-none text-[#E8EDE8] placeholder-[#4A5A4A] mb-2"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}
                />
                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[#4A5A4A]"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem" }}
                    >
                      @
                    </span>
                    <input
                      type="text"
                      value={item.owner ?? ""}
                      onChange={(e) => updateItem(idx, { owner: e.target.value })}
                      placeholder="owner"
                      className="bg-transparent outline-none text-[#8A9A8A] placeholder-[#4A5A4A] w-24"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}
                    />
                  </div>
                  <input
                    type="date"
                    value={item.dueDate ? item.dueDate.split("T")[0] : ""}
                    onChange={(e) => updateItem(idx, { dueDate: e.target.value || undefined })}
                    className="bg-transparent outline-none text-[#8A9A8A] w-36"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: "0.75rem",
                      colorScheme: "dark",
                    }}
                  />
                  <PriorityBadge
                    priority={item.priority ?? "medium"}
                    onChange={(p) => updateItem(idx, { priority: p })}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="ml-auto text-[#4A5A4A] hover:text-[#FF5C5C] transition-colors duration-[120ms]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Decisions */}
        {extraction.decisions.length > 0 && (
          <section>
            <p
              className="uppercase tracking-[0.06em] text-[#8A9A8A] mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
            >
              Decisions ({extraction.decisions.length})
            </p>
            <ul className="space-y-1.5">
              {extraction.decisions.map((decision, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#00E87A] mt-0.5 shrink-0" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>✓</span>
                  <span className="text-[#E8EDE8]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                    {decision}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Open Questions */}
        {extraction.openQuestions.length > 0 && (
          <section>
            <p
              className="uppercase tracking-[0.06em] text-[#8A9A8A] mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem", fontWeight: 500 }}
            >
              Open Questions ({extraction.openQuestions.length})
            </p>
            <ul className="space-y-1.5">
              {extraction.openQuestions.map((q, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#F5A623] mt-0.5 shrink-0" style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>?</span>
                  <span className="text-[#8A9A8A]" style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}>
                    {q}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Approve footer */}
      <div className="px-5 py-4 border-t border-[#242824]">
        {error && (
          <p
            className="text-[#FF5C5C] mb-3"
            style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="w-full py-3 rounded-[4px] uppercase tracking-[0.06em] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[120ms]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.75rem",
            fontWeight: 700,
            backgroundColor: submitting ? "#00A855" : "#00E87A",
            color: "#001A0D",
          }}
        >
          {submitting ? "Dispatching…" : "✓  Approve & Send to All Destinations"}
        </button>
      </div>
    </div>
  );
}
