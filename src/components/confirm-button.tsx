"use client";

import { useRef } from "react";
import { SubmitButton } from "@/components/submit-button";

/**
 * A button that opens a native dialog before running a server action. The dialog
 * handles the focus trap, Escape and returning focus to the button.
 */
export function ConfirmButton({
  label,
  ariaLabel,
  title,
  body,
  confirmLabel,
  action,
  fields,
  danger = true,
}: {
  label: string;
  ariaLabel?: string;
  title: string;
  body: string;
  confirmLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  danger?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={danger ? "btn btn-danger" : "btn"}
        aria-label={ariaLabel}
        onClick={() => dialogRef.current?.showModal()}
      >
        {label}
      </button>
      <dialog ref={dialogRef} aria-label={title}>
        <h2>{title}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          {body}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <form
            action={async (formData) => {
              await action(formData);
              dialogRef.current?.close();
            }}
          >
            {Object.entries(fields ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <SubmitButton className={danger ? "btn btn-solid-danger" : "btn btn-primary"}>
              {confirmLabel}
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
