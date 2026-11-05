import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode = rawMode === "signup" ? "signup" : "login";

  return (
    <main id="main" className="login">
      <h1>{mode === "signup" ? "Create your account" : "Log in to Chasely"}</h1>
      <p className="muted">Collect client documents without the back and forth.</p>
      {/* The key resets the form when switching between log in and sign up. */}
      <LoginForm key={mode} mode={mode} />
      <p className="muted" style={{ marginTop: 24 }}>
        {mode === "signup" ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/login?mode=signup">Create an account</Link>
          </>
        )}
      </p>
    </main>
  );
}
