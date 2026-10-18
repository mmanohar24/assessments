import type { Confidence } from "../types";

const STYLES: Record<Confidence, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  low: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const style = STYLES[confidence] ?? STYLES.low;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {confidence} confidence
    </span>
  );
}
