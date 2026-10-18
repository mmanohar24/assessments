"use client";

import { useState } from "react";
import type { GapCluster } from "../types";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function GapCard({ cluster }: { cluster: GapCluster }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cluster.followup_question);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable; silently ignore.
    }
  }

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          What&rsquo;s been studied
        </p>
        <ConfidenceBadge confidence={cluster.confidence} />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">
        {cluster.theme}
      </p>

      <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
          Gap
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-900">
          {cluster.gap}
        </p>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 border-t border-neutral-100 pt-4">
        <p className="text-[15px] italic leading-relaxed text-neutral-700">
          {cluster.followup_question}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </article>
  );
}
