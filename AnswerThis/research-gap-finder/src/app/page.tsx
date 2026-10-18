"use client";

import { useRef, useState } from "react";
import type { AnalysisResult } from "./types";
import { GapCard } from "./components/GapCard";

type Status = "idle" | "loading" | "error";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runAnalysis(q: string) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setResult(data as AnalysisResult);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "loading") return;
    runAnalysis(trimmed);
  }

  function handleReset() {
    setStatus("idle");
    setError("");
    setResult(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSearchAgain() {
    setResult(null);
    setQuestion("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="border-b border-neutral-100">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Research Gap Finder
          </h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            Discover what hasn&rsquo;t been studied yet.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your research question..."
            disabled={status === "loading"}
            className="w-full flex-1 rounded-md border border-neutral-300 px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || !question.trim()}
            className="w-full shrink-0 rounded-md bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
          >
            {status === "loading" ? "Analyzing..." : "Submit"}
          </button>
        </form>

        {status === "loading" && (
          <div className="mt-16 flex flex-col items-center gap-3 text-neutral-500">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
            <p className="text-[15px]">Analyzing research landscape...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-10 rounded-md border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-[15px] text-red-700">{error}</p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {status === "idle" && result && (
          <div className="mt-10">
            {result.disclaimer && (
              <div className="mb-6 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-[15px] text-neutral-600">
                {result.disclaimer}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {result.clusters.map((cluster, i) => (
                <GapCard key={i} cluster={cluster} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleSearchAgain}
                className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Search again
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-100 py-6 text-center text-xs text-neutral-400">
        Powered by Claude &middot; Not a substitute for a full literature review
      </footer>
    </div>
  );
}
