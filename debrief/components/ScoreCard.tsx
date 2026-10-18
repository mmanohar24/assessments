"use client";

interface ScoreCardProps {
  score: number;
  rationale: string;
  decisionCount: number;
  actionItemCount: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#00E87A";
  if (score >= 40) return "#F5A623";
  return "#FF5C5C";
}

function scoreSurface(score: number): string {
  if (score >= 70) return "#003D22";
  if (score >= 40) return "#2A1E00";
  return "#2A0A0A";
}

export function ScoreCard({ score, rationale, decisionCount, actionItemCount }: ScoreCardProps) {
  const color = scoreColor(score);
  const surface = scoreSurface(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div
      className="rounded-[6px] border border-[#242824] p-5"
      style={{ backgroundColor: "#161916" }}
    >
      <p
        className="text-[#8A9A8A] uppercase tracking-[0.06em] mb-4"
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem", fontWeight: 500 }}
      >
        Meeting Score Card
      </p>

      <div className="flex items-end gap-4 mb-4">
        <span
          className="leading-none"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "3rem",
            fontWeight: 700,
            color,
            letterSpacing: "-0.03em",
          }}
        >
          {clampedScore}
        </span>
        <span
          className="mb-2 text-[#4A5A4A]"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "1.25rem", fontWeight: 600 }}
        >
          / 100
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 rounded-full bg-[#242824] mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${clampedScore}%`, backgroundColor: color }}
        />
      </div>

      {/* Rationale */}
      <p
        className="text-[#8A9A8A] mb-5 leading-relaxed"
        style={{ fontFamily: "var(--font-inter)", fontSize: "0.875rem" }}
      >
        {rationale}
      </p>

      {/* Stat chips */}
      <div className="flex gap-3 flex-wrap">
        <span
          className="px-3 py-1 rounded-[2px] uppercase tracking-[0.06em]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.75rem",
            fontWeight: 500,
            backgroundColor: surface,
            color,
          }}
        >
          {decisionCount} Decision{decisionCount !== 1 ? "s" : ""}
        </span>
        <span
          className="px-3 py-1 rounded-[2px] uppercase tracking-[0.06em] bg-[#0A1F3D] text-[#4D9EFF]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          {actionItemCount} Action Item{actionItemCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
