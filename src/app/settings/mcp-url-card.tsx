"use client";

import { useRef, useState, useTransition } from "react";
import { regenerateMcpUrl, type TokenState } from "./actions";

export function McpUrlCard({ createdLabel }: { createdLabel: string | null }) {
  const [state, setState] = useState<TokenState>({});
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasToken = createdLabel !== null;

  function generate() {
    startTransition(async () => {
      setCopied(false);
      setState(await regenerateMcpUrl());
      dialogRef.current?.close();
    });
  }

  async function copy() {
    if (!state.mcpUrl) return;
    try {
      await navigator.clipboard.writeText(state.mcpUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card" aria-labelledby="mcp-heading">
      <h2 id="mcp-heading">Your MCP URL</h2>
      <p className="muted">
        Add this URL to Claude as a custom connector. Claude can then save checklists to your
        account. Treat it like a password: anyone who has it can create checklists as you.
      </p>

      {state.mcpUrl ? (
        <div className="secret">
          <strong>Copy it now. You won&rsquo;t see it again.</strong>
          <code translate="no">{state.mcpUrl}</code>
          <button type="button" className="btn" onClick={copy}>
            {copied ? "Copied" : "Copy URL"}
          </button>
          <span aria-live="polite" className="small muted">
            {copied ? "The URL is on your clipboard." : ""}
          </span>
        </div>
      ) : hasToken ? (
        <p className="small muted">
          Current URL made on {createdLabel}. It&rsquo;s only shown once. If you&rsquo;ve lost it,
          make a new one.
        </p>
      ) : null}

      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}

      {hasToken ? (
        <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>
          Regenerate…
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={generate} disabled={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          Create my MCP URL
        </button>
      )}

      <dialog ref={dialogRef} aria-label="Regenerate your MCP URL?">
        <h2>Regenerate your MCP URL?</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Your current URL stops working right away. You&rsquo;ll need to update the connector in
          Claude with the new one.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn-solid-danger" onClick={generate} disabled={pending}>
            {pending ? <span className="spinner" aria-hidden="true" /> : null}
            Regenerate
          </button>
        </div>
      </dialog>

      <div className="connect-steps">
        <h3 id="connect-heading">Connect Chasely to Claude</h3>
        <ol aria-labelledby="connect-heading">
          <li>
            Copy your MCP URL. If you no longer have it, make a new one with the button above.
          </li>
          <li>
            In Claude, open{" "}
            <a href="https://claude.ai/customize/connectors" target="_blank" rel="noreferrer">
              Customize &gt; Connectors
            </a>
            .
          </li>
          <li>Click Add, then choose to add a custom connector.</li>
          <li>Name it Chasely, paste the URL and click Continue.</li>
          <li>When Claude asks about authentication, choose &ldquo;No sign in&rdquo;, then click Add.</li>
          <li>
            In a chat, click +, open Connectors and check Chasely is on. Then ask Claude to make a
            document checklist.
          </li>
        </ol>
        <p className="small muted">
          Claude may ask you to approve each tool the first time. Free Claude plans allow one custom
          connector. On Team and Enterprise plans, an Owner adds it under Organization settings &gt;
          Connectors.
        </p>
      </div>
    </section>
  );
}
