"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addItem,
  markReceived,
  removeItem,
  undoReceived,
  updateDetails,
  updateItem,
  type FormState,
} from "@/app/checklists/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { LIMITS } from "@/lib/validation";

const STATUS_LABEL = {
  pending: "Waiting for client",
  sent: "Client says sent",
  received: "Received",
} as const;

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

type Item = {
  id: string;
  title: string;
  note: string;
  status: keyof typeof STATUS_LABEL;
  client_note: string | null;
};

export function ItemEditor({
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
  const { state, formAction, formRef, dirty, setDirty } = useSavedForm(updateItem);
  const titleError = state.fieldErrors?.title;
  const noteError = state.fieldErrors?.note;
  const itemFields = { checklist_id: checklistId, item_id: item.id };

  return (
    <article className="item" aria-label={`Document ${number}: ${item.title}`}>
      <div className="item-status">
        <span className={`badge badge-${item.status}`}>{STATUS_LABEL[item.status]}</span>
        <span className="spacer" />
        {!closed && item.status !== "received" ? (
          <form action={markReceived}>
            <input type="hidden" name="checklist_id" value={checklistId} />
            <input type="hidden" name="item_id" value={item.id} />
            {/* The filled button is for items the client says they sent. */}
            <SubmitButton
              className={item.status === "sent" ? "btn btn-primary" : "btn"}
              ariaLabel={`Mark ${item.title} as received`}
            >
              Mark received
            </SubmitButton>
          </form>
        ) : null}
        {!closed && item.status === "received" ? (
          <form action={undoReceived}>
            <input type="hidden" name="checklist_id" value={checklistId} />
            <input type="hidden" name="item_id" value={item.id} />
            <SubmitButton ariaLabel={`Undo received for ${item.title}`}>Undo received</SubmitButton>
          </form>
        ) : null}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="stack"
        noValidate
        data-dirty={dirty}
        onInput={() => setDirty(true)}
      >
        <input type="hidden" name="checklist_id" value={checklistId} />
        <input type="hidden" name="item_id" value={item.id} />
        <div className="field">
          <label htmlFor={`title-${item.id}`}>Title</label>
          <input
            id={`title-${item.id}`}
            className="input"
            name="title"
            defaultValue={state.values?.title ?? item.title}
            disabled={closed}
            autoComplete="off"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? `title-error-${item.id}` : undefined}
          />
          <FieldError id={`title-error-${item.id}`} message={titleError} />
        </div>
        <div className="field">
          <label htmlFor={`note-${item.id}`}>Note, why it&rsquo;s needed</label>
          <textarea
            id={`note-${item.id}`}
            className="input"
            name="note"
            rows={2}
            defaultValue={state.values?.note ?? item.note}
            disabled={closed}
            aria-invalid={noteError ? true : undefined}
            aria-describedby={noteError ? `note-error-${item.id}` : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <FieldError id={`note-error-${item.id}`} message={noteError} />
        </div>

        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}

        {closed ? null : (
          <div className="item-actions">
            <SubmitButton ariaLabel={`Save changes to ${item.title}`}>Save</SubmitButton>
            <span className="success small" aria-live="polite">
              {state.ok && !dirty ? "Saved" : ""}
            </span>
          </div>
        )}
      </form>

      {item.client_note ? (
        <div className="field">
          <p className="small muted">The client wrote:</p>
          <p className="client-note">{item.client_note}</p>
        </div>
      ) : null}

      {closed ? null : (
        <div className="item-actions">
          <ConfirmButton
            label="Remove…"
            ariaLabel={`Remove ${item.title}`}
            title={`Remove "${item.title}"?`}
            body="This takes it off the checklist, including anything the client ticked or wrote for it. This can't be undone."
            confirmLabel="Remove document"
            action={removeItem}
            fields={itemFields}
          />
        </div>
      )}
    </article>
  );
}

export function AddItemForm({ checklistId }: { checklistId: string }) {
  const { state, formAction, formRef, dirty, setDirty } = useSavedForm(addItem);
  const titleError = state.fieldErrors?.title;
  const noteError = state.fieldErrors?.note;

  // Clear the form once the new item has been saved.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state, formRef]);

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
      <div className="field">
        <label htmlFor="new-title">Title</label>
        <input
          id="new-title"
          className="input"
          name="title"
          autoComplete="off"
          placeholder="Bank statements, April to March…"
          defaultValue={state.values?.title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "new-title-error" : `new-title-hint`}
        />
        {titleError ? null : (
          <p id="new-title-hint" className="small muted">
            Up to {LIMITS.title} characters. Put the reason in the note.
          </p>
        )}
        <FieldError id="new-title-error" message={titleError} />
      </div>
      <div className="field">
        <label htmlFor="new-note">Note, why it&rsquo;s needed</label>
        <textarea
          id="new-note"
          className="input"
          name="note"
          rows={2}
          placeholder="Shows your rental income for the year…"
          defaultValue={state.values?.note}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "new-note-error" : undefined}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <FieldError id="new-note-error" message={noteError} />
      </div>
      {state.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <SubmitButton className="btn btn-primary">Add document</SubmitButton>
      </div>
    </form>
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
          <SubmitButton>Save details</SubmitButton>
          <span className="success small" aria-live="polite">
            {state.ok && !dirty ? "Saved" : ""}
          </span>
          <SendReminderButton hasEmail={Boolean(clientEmail)} />
        </div>
      )}
    </form>
  );
}

/**
 * Placeholder until email is wired up in build step 3. It sends nothing, and says so
 * plainly so nobody thinks a client was reminded.
 */
function SendReminderButton({ hasEmail }: { hasEmail: boolean }) {
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() =>
          setMessage(
            hasEmail
              ? "Reminder emails aren't switched on yet, so nothing was sent."
              : "Reminders need a client email. Add one above and save it first.",
          )
        }
      >
        Send reminder
      </button>
      <span className="small muted" aria-live="polite">
        {message}
      </span>
    </>
  );
}
