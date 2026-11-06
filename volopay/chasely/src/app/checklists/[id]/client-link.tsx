"use client";

import { useState } from "react";

/** The client's private link, with a copy button. Anyone who has it can tick items. */
export function ClientLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="banner">
      <div className="break" style={{ display: "grid", gap: 4 }}>
        <strong>Client link</strong>
        <span className="small muted">Send this only to your client. Anyone with it can tick items.</span>
        <a href={url} target="_blank" rel="noreferrer" className="small" translate="no">
          {url}
        </a>
      </div>
      <button type="button" className="btn" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "The client link is on your clipboard." : ""}
      </span>
    </div>
  );
}
