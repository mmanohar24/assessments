"use client";

import { useOptimistic, useState, useTransition } from "react";
import { LIMITS } from "@/lib/validation";
import { saveClientNote, setItemSent } from "./actions";

export type ClientItemData = {
  id: string;
  title: string;
  note: string;
  status: "pending" | "sent" | "received";
  client_note: string | null;
};

export function ClientItem({ token, item }: { token: string; item: ClientItemData }) {
  const received = item.status === "received";
  const [sent, setOptimisticSent] = useOptimistic(item.status === "sent");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle(next: boolean) {
    if (pending) return;
    setError("");
    startTransition(async () => {
      setOptimisticSent(next);
      // If this fails, the box goes back to what's saved once the transition ends.
      const result = await setItemSent(token, item.id, next);
      if (!result.ok) setError(result.error);
    });
  }

  const checkId = `sent-${item.id}`;

  return (
    <article className="client-item" aria-labelledby={`title-${item.id}`}>
      <h2 id={`title-${item.id}`} className="break">
        {item.title}
      </h2>
      {item.note ? <p className="muted break">{item.note}</p> : null}

      {received ? (
        <p className="client-received">
          <span className="badge badge-received">Received</span>
          <span className="small muted">Your accountant has this. Nothing more to do.</span>
        </p>
      ) : (
        <label htmlFor={checkId} className={`client-check${sent ? " is-checked" : ""}`}>
          <input
            id={checkId}
            type="checkbox"
            checked={sent}
            onChange={(event) => toggle(event.currentTarget.checked)}
            aria-describedby={error ? `error-${item.id}` : undefined}
          />
          <span>I&rsquo;ve sent this</span>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
        </label>
      )}
      <p id={`error-${item.id}`} className="error" role="status" aria-live="polite">
        {error}
      </p>

      <ClientNote token={token} itemId={item.id} saved={item.client_note} locked={received} />
    </article>
  );
}

function ClientNote({
  token,
  itemId,
  saved,
  locked,
}: {
  token: string;
  itemId: string;
  saved: string | null;
  locked: boolean;
}) {
  const [text, setText] = useState(saved ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const length = text.trim().length;
  const tooLong = length > LIMITS.clientNote;
  const fieldId = `note-${itemId}`;

  if (locked) {
    return saved ? (
      <div className="field">
        <p className="small muted">Your note</p>
        <p className="client-note">{saved}</p>
      </div>
    ) : null;
  }

  function save() {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveClientNote(token, itemId, text);
      setMessage(result.ok ? { ok: true, text: "Note saved" } : { ok: false, text: result.error });
    });
  }

  return (
    <details className="client-details" open={Boolean(saved) || undefined}>
      <summary>{saved ? "Your note" : "Add a note (optional)"}</summary>
      <form
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label htmlFor={fieldId}>Note for your accountant</label>
          <p id={`${fieldId}-hint`} className="small notice">
            Don&rsquo;t type account or ID numbers.
          </p>
          <textarea
            id={fieldId}
            className="input"
            name="client_note"
            rows={3}
            value={text}
            placeholder="I sent this by email on Monday…"
            onChange={(event) => {
              setText(event.target.value);
              setMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                save();
              }
            }}
            aria-invalid={tooLong || (message && !message.ok) ? true : undefined}
            aria-describedby={`${fieldId}-hint ${fieldId}-count ${fieldId}-message`}
          />
          <p id={`${fieldId}-count`} className={`small num ${tooLong ? "error" : "muted"}`}>
            {length} / {LIMITS.clientNote}
          </p>
        </div>
        <div className="item-actions">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? <span className="spinner" aria-hidden="true" /> : null}
            Save note
          </button>
          <span
            id={`${fieldId}-message`}
            className={`small ${message?.ok ? "success" : "error"}`}
            aria-live="polite"
          >
            {message?.text ?? ""}
          </span>
        </div>
      </form>
    </details>
  );
}
