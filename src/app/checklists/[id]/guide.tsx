"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { QuestionIcon } from "@/components/icons";
import { StatusChip } from "./editor-forms";

// The first-time "How this page works" box on the Documents step, and the header
// button that brings it back. Dismissal is remembered in this browser only.

const STORAGE_KEY = "chasely.editorGuide.dismissed";

type GuideState = {
  /** null until we've checked storage, so nothing flashes on load. */
  open: boolean | null;
  show: () => void;
  dismiss: () => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

const GuideContext = createContext<GuideState | null>(null);

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage blocked: show the guide each time.
    return false;
  }
}

function saveDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage blocked: nothing to remember it in.
  }
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists in the browser
    setOpen(!readDismissed());
  }, []);

  useEffect(() => {
    if (open && focusHeading.current) {
      focusHeading.current = false;
      headingRef.current?.focus();
    }
  }, [open]);

  const value: GuideState = {
    open,
    show: () => {
      focusHeading.current = true;
      setOpen(true);
    },
    dismiss: () => {
      saveDismissed();
      setOpen(false);
      toggleRef.current?.focus();
    },
    toggleRef,
    headingRef,
  };
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

function useGuide() {
  const guide = useContext(GuideContext);
  if (!guide) throw new Error("Guide parts must be inside GuideProvider");
  return guide;
}

export function GuideToggle() {
  const { open, show, dismiss, toggleRef } = useGuide();
  return (
    <button
      ref={toggleRef}
      type="button"
      className="btn btn-quiet guide-toggle"
      aria-expanded={open === true}
      aria-controls="editor-guide"
      onClick={() => (open ? dismiss() : show())}
    >
      <QuestionIcon size={16} />
      <span className="guide-toggle-label">How this works</span>
    </button>
  );
}

export function GuidePanel() {
  const { open, dismiss, headingRef } = useGuide();
  if (!open) return null;
  return (
    <section id="editor-guide" className="guide" role="region" aria-labelledby="guide-heading">
      <h2 id="guide-heading" ref={headingRef} tabIndex={-1} className="guide-heading">
        How this page works
      </h2>
      <p>
        Claude creates the checklist. Your client ticks items on their private link. You confirm
        what you actually receive.
      </p>
      <dl className="guide-legend">
        <dt>
          <StatusChip status="pending" />
        </dt>
        <dd>Nothing from the client yet.</dd>
        <dt>
          <StatusChip status="sent" />
        </dt>
        <dd>They say they sent it. Check, then confirm.</dd>
        <dt>
          <StatusChip status="received" />
        </dt>
        <dd>You confirmed it.</dd>
      </dl>
      <p>
        A filled Mark received means it&rsquo;s your move. An outlined one means it&rsquo;s
        optional, for example if they emailed it.
      </p>
      <p>When you&rsquo;re ready, share the link in step 3.</p>
      <div className="guide-actions">
        <button type="button" className="btn btn-primary" onClick={dismiss}>
          Got it
        </button>
      </div>
    </section>
  );
}
