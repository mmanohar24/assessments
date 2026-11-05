"use client";

import { useFormStatus } from "react-dom";

/** Keeps its label and shows a spinner while the form is saving. */
export function SubmitButton({
  children,
  className = "btn",
  disabled = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-label={ariaLabel}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
