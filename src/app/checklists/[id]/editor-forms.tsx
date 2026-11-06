"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  addItem,
  markReceived,
  removeItem,
  sendChecklistReminder,
  undoReceived,
  updateDetails,
  updateItem,
  type FormState,
} from "@/app/checklists/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { BellIcon, CheckIcon, ClockIcon, InfoIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { LIMITS } from "@/lib/validation";

const STATUS_LABEL = {
  pending: "Waiting for client",
  sent: "Client says sent",
  received: "Received",
} as const;

/** The status chip. Used on each row and in the guide's legend. */
export function StatusChip({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <span className={`badge badge-${status}`}>
      {status === "pending" ? <ClockIcon size={12} /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Mark received and Unmark swap places after a save. For a short moment after the
 * swap, clicks are ignored, so a quick double click can't flip it straight back.
 * It stays focusable the whole time.
 */
function RowActionButton({
  className,
  ariaLabel,
  cooling,
  buttonRef,
  children,
}: {
  className: string;
  ariaLabel: string;
  cooling: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const blocked = pending || cooling;
  return (
    <button
      ref={buttonRef}
      type="submit"
      className={className}
      aria-label={ariaLabel}
      aria-disabled={blocked || undefined}
      onClick={(event) => {
        if (blocked) event.preventDefault();
      }}
    >
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

const SWAP_COOLDOWN_MS = 600;

/** Warns before leaving if any form on the page has changes that aren't saved. */
export function UnsavedChangesGuard() {
  useEffect(() => {
    const isDirty = () => document.querySelector('form[data-dirty="true"]') !== null;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty()) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (link && isDirty() && !window.confirm("You have changes that aren't saved. Leave anyway?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}

type SavedFormState = FormState & { values?: Record<string, string> };

/** Runs a form action, tracks unsaved edits, and focuses the first bad field. */
function useSavedForm(action: (state: FormState, data: FormData) => Promise<FormState>) {
  // React resets a form to its default values after an action runs. When a save
  // doesn't succeed, those defaults become what was typed, so nothing is lost.
  const [state, formAction] = useActionState<SavedFormState, FormData>(async (previous, data) => {
    const result = await action(previous, data);
    return result.ok ? result : { ...result, values: Object.fromEntries(data) as Record<string, string> };
  }, {});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset after the save result arrives
      setDirty(false);
    }
    const firstBad = state.fieldErrors ? Object.keys(state.fieldErrors)[0] : null;
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
    }
  }, [state]);

  return { state, formAction, formRef, dirty, setDirty };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="error" aria-live="polite">
      {message}
    </p>
  );
}

export type Item = {
  id: string;
  title: string;
  note: string;
  status: keyof typeof STATUS_LABEL;
  client_note: string | null;
};

/** One compact row: title, status, the client's note, and quick actions. */
export function DocumentRow({
  checklistId,
  item,
  number,
  closed,
}: {
  checklistId: string;
  item: Item;
  number: number;
  closed: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const removingRef = useRef(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [cooling, setCooling] = useState(false);
  const lastStatus = useRef(item.status);

  // After Mark received or Unmark, the other button takes its place. Ignore clicks on
  // it for a moment, and keep focus on it if the old button had focus.
  useEffect(() => {
    const wasReceived = lastStatus.current === "received";
    lastStatus.current = item.status;
    if (wasReceived === (item.status === "received")) return;
    setCooling(true);
    if (document.activeElement === document.body || document.activeElement === null) {
      actionRef.current?.focus();
    }
    const timer = setTimeout(() => setCooling(false), SWAP_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [item.status]);

  // When this row is removed its buttons go with it, so move focus somewhere
  // sensible instead of losing it.
  useEffect(
    () => () => {
      if (!removingRef.current) return;
      setTimeout(() => {
        const target =
          document.getElementById("add-document") ?? document.getElementById("step-heading");
        target?.focus();
      }, 0);
    },
    [],
  );

  return (
    <li className={`doc-row doc-row-${item.status}`}>
      <div className="doc-main">
        <p className="doc-title break">
          <span className="doc-num num" aria-hidden="true">
            {number}.
          </span>{" "}
          {item.title}
        </p>
        {item.note ? <p className="small muted doc-note break">{item.note}</p> : null}
        {item.client_note ? (
          <div className="doc-client-note">
            <p className="small doc-client-label">Written by the client</p>
            <p className="break">{item.client_note}</p>
          </div>
        ) : null}
      </div>

      <div className="doc-side">
        <StatusChip status={item.status} />
        {closed ? null : (
          <div className="doc-actions">
            {item.status === "received" ? (
              <form action={undoReceived}>
                <input type="hidden" name="checklist_id" value={checklistId} />
                <input type="hidden" name="item_id" value={item.id} />
                <RowActionButton
                  className="btn btn-text"
                  ariaLabel={`Unmark ${item.title} as received`}
                  cooling={cooling}
                  buttonRef={actionRef}
                >
                  Unmark
                </RowActionButton>
              </form>
            ) : (
              <form action={markReceived}>
                <input type="hidden" name="checklist_id" value={checklistId} />
                <input type="hidden" name="item_id" value={item.id} />
                {/* The filled button is for items the client says they sent. */}
                <RowActionButton
                  className={item.status === "sent" ? "btn btn-primary" : "btn"}
                  ariaLabel={`Mark ${item.title} as received`}
                  cooling={cooling}
                  buttonRef={actionRef}
                >
                  Mark received
                </RowActionButton>
              </form>
            )}
            <button
              ref={editRef}
              type="button"
              className="btn btn-text"
              aria-label={`Edit ${item.title}`}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <ItemModal
          mode="edit"
          checklistId={checklistId}
          item={item}
          onRemove={() => {
            removingRef.current = true;
          }}
          onClose={() => {
            setEditing(false);
            if (!removingRef.current) editRef.current?.focus();
          }}
        />
      ) : null}
    </li>
  );
}

/** Opens the same modal, empty, to add a document. */
export function AddDocumentButton({ checklistId }: { checklistId: string }) {
  const [adding, setAdding] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={buttonRef}
        id="add-document"
        type="button"
        className="btn btn-primary"
        onClick={() => setAdding(true)}
      >
        Add document
      </button>
      {adding ? (
        <ItemModal
          mode="add"
          checklistId={checklistId}
          onClose={() => {
            setAdding(false);
            buttonRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

const DISCARD = "You have changes that aren't saved. Discard them?";

/**
 * Edit or add one document in a native modal dialog. The dialog keeps focus inside,
 * Escape closes it, and onClose puts focus back on the button that opened it.
 * It only exists while open, so closing it throws away unsaved changes.
 */
function ItemModal({
  mode,
  checklistId,
  item,
  onRemove,
  onClose,
}: {
  mode: "edit" | "add";
  checklistId: string;
  item?: Item;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const { state, formAction, formRef, dirty, setDirty } = useSavedForm(
    mode === "edit" ? updateItem : addItem,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleError = state.fieldErrors?.title;
  const noteError = state.fieldErrors?.note;
  const key = item?.id ?? "new";
  const heading = mode === "edit" ? "Edit document" : "Add a document";

  // Open as soon as it mounts. Focus goes to the first field.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Close once the save works.
  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state]);

  function cancel() {
    if (dirty && !window.confirm(DISCARD)) return;
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="item-modal"
      aria-labelledby={`modal-heading-${key}`}
      onClose={onClose}
      onCancel={(event) => {
        // Escape. Ask first if something was typed.
        if (dirty && !window.confirm(DISCARD)) event.preventDefault();
      }}
    >
      <h2 id={`modal-heading-${key}`}>{heading}</h2>
      <form
        ref={formRef}
        action={formAction}
        className="stack"
        noValidate
        data-dirty={dirty}
        onInput={() => setDirty(true)}
        style={{ marginTop: 16 }}
      >
        <input type="hidden" name="checklist_id" value={checklistId} />
        {item ? <input type="hidden" name="item_id" value={item.id} /> : null}
        <div className="field">
          <label htmlFor={`title-${key}`}>Title</label>
          <input
            id={`title-${key}`}
            className="input"
            name="title"
            autoComplete="off"
            placeholder={item ? undefined : "Bank statements, April to March…"}
            defaultValue={state.values?.title ?? item?.title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? `title-error-${key}` : `title-hint-${key}`}
          />
          {titleError ? null : (
            <p id={`title-hint-${key}`} className="small muted">
              Up to {LIMITS.title} characters. Put the reason in the note.
            </p>
          )}
          <FieldError id={`title-error-${key}`} message={titleError} />
        </div>
        <div className="field">
          <label htmlFor={`note-${key}`}>Note, why it&rsquo;s needed</label>
          <textarea
            id={`note-${key}`}
            className="input"
            name="note"
            rows={3}
            placeholder={item ? undefined : "Shows your rental income for the year…"}
            defaultValue={state.values?.note ?? item?.note}
            aria-invalid={noteError ? true : undefined}
            aria-describedby={noteError ? `note-error-${key}` : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <FieldError id={`note-error-${key}`} message={noteError} />
        </div>

        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
          <SubmitButton className="btn btn-primary">{mode === "edit" ? "Save" : "Add document"}</SubmitButton>
        </div>
      </form>

      {/* Outside the form above, because the confirm step has a form of its own. */}
      {item ? (
        <div className="modal-remove">
          <ConfirmButton
            label="Remove"
            ariaLabel={`Remove ${item.title}`}
            title={`Remove "${item.title}"?`}
            body="This takes it off the checklist, including anything the client ticked or wrote for it. This can't be undone."
            confirmLabel="Remove document"
            action={async (formData) => {
              onRemove?.();
              await removeItem(formData);
            }}
            fields={{ checklist_id: checklistId, item_id: item.id }}
          />
          <span className="small muted">Takes this document off the checklist.</span>
        </div>
      ) : null}
    </dialog>
  );
}

export function DetailsForm({
  checklistId,
  clientName,
  clientEmail,
  dueDate,
  closed,
}: {
  checklistId: string;
  clientName: string;
  clientEmail: string | null;
  dueDate: string;
  closed: boolean;
}) {
  const { state, formAction, formRef, dirty, setDirty } = useSavedForm(updateDetails);
  const errors = state.fieldErrors ?? {};
  const [showSaved, setShowSaved] = useState(false);

  // Show "Saved" for a few seconds after a save works.
  useEffect(() => {
    if (!state.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- brief confirmation after saving
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="stack"
      noValidate
      data-dirty={dirty}
      onInput={() => setDirty(true)}
    >
      <input type="hidden" name="checklist_id" value={checklistId} />
      <div className="details-grid">
        <div className="field">
          <label htmlFor="client-name">Client name</label>
          <input
            id="client-name"
            className="input"
            name="client_name"
            autoComplete="off"
            defaultValue={state.values?.client_name ?? clientName}
            disabled={closed}
            aria-invalid={errors.client_name ? true : undefined}
            aria-describedby={errors.client_name ? "client-name-error" : undefined}
          />
          <FieldError id="client-name-error" message={errors.client_name} />
        </div>
        <div className="field">
          <label htmlFor="client-email">Client email, for reminders</label>
          <input
            id="client-email"
            className="input"
            name="client_email"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="ravi@example.com…"
            defaultValue={state.values?.client_email ?? clientEmail ?? ""}
            disabled={closed}
            aria-invalid={errors.client_email ? true : undefined}
            aria-describedby={errors.client_email ? "client-email-error" : undefined}
          />
          <FieldError id="client-email-error" message={errors.client_email} />
        </div>
        <div className="field">
          <label htmlFor="due-date">Due date</label>
          <input
            id="due-date"
            className="input"
            name="due_date"
            type="date"
            defaultValue={state.values?.due_date ?? dueDate}
            disabled={closed}
            aria-invalid={errors.due_date ? true : undefined}
            aria-describedby={errors.due_date ? "due-date-error" : undefined}
          />
          <FieldError id="due-date-error" message={errors.due_date} />
        </div>
      </div>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
      {closed ? null : (
        <div className="item-actions">
          {/* Off until something changes, so it's clear when there's nothing to save. */}
          <SubmitButton className="btn btn-primary" disabled={!dirty}>
            Save details
          </SubmitButton>
          <span className="small save-status" aria-live="polite">
            {dirty ? (
              <span className="muted">Unsaved changes</span>
            ) : showSaved ? (
              <span className="success saved-flash">
                <CheckIcon size={14} />
                Saved
              </span>
            ) : null}
          </span>
        </div>
      )}
    </form>
  );
}

/** Sends one real reminder email. The server checks every rule again. */
export function SendReminderButton({ checklistId, hasEmail }: { checklistId: string; hasEmail: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function send() {
    if (pending) return;
    if (!hasEmail) {
      setResult({ ok: false, text: "Reminders need a client email. Add one in step 2 and save it first." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const outcome = await sendChecklistReminder(checklistId);
      let text = outcome.message;
      if (outcome.nextAt) {
        // Shown in the accountant's own time zone, worked out in their browser.
        const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(outcome.nextAt),
        );
        text = `${text} The next one can go out after ${when}.`;
      }
      setResult({ ok: outcome.ok, text });
    });
  }

  return (
    <div className="reminder">
      <div className="item-actions">
        <button type="button" className="btn btn-primary" onClick={send} disabled={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : <BellIcon size={16} />}
          Send reminder
        </button>
        {result?.ok ? (
          <span className="small success saved-flash" role="status">
            <CheckIcon size={14} />
            {result.text}
          </span>
        ) : null}
      </div>
      {/* Refusals get a calm box with the reason, not small red text. */}
      <div aria-live="polite">
        {result && !result.ok ? (
          <div className="callout" role="status">
            <InfoIcon size={16} />
            <p>{result.text}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
