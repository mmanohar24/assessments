"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { authenticate, type AuthState } from "./actions";

export function LoginForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action] = useActionState<AuthState, FormData>(authenticate, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // On a failed submit, move focus to the first field with a problem.
  useEffect(() => {
    if (state.emailError) emailRef.current?.focus();
    else if (state.passwordError) passwordRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="mode" value={mode} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          ref={emailRef}
          id="email"
          className="input"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          autoCapitalize="none"
          placeholder="you@yourfirm.com…"
          defaultValue={state.email}
          aria-invalid={state.emailError ? true : undefined}
          aria-describedby={state.emailError ? "email-error" : undefined}
        />
        {state.emailError ? (
          <p id="email-error" className="error" aria-live="polite">
            {state.emailError}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          ref={passwordRef}
          id="password"
          className="input"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-invalid={state.passwordError ? true : undefined}
          aria-describedby={state.passwordError ? "password-error" : undefined}
        />
        {state.passwordError ? (
          <p id="password-error" className="error" aria-live="polite">
            {state.passwordError}
          </p>
        ) : null}
      </div>
      {state.formError ? (
        <p className="error" role="alert">
          {state.formError}
        </p>
      ) : null}
      <SubmitButton className="btn btn-primary">
        {mode === "signup" ? "Create account" : "Log in"}
      </SubmitButton>
    </form>
  );
}
