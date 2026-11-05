"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthState = {
  emailError?: string;
  passwordError?: string;
  formError?: string;
  email?: string;
};

function friendlyAuthError(code: string | undefined, message: string): string {
  if (code === "invalid_credentials") return "That email and password don't match.";
  if (code === "user_already_exists") return "There's already an account with this email. Log in instead.";
  if (code === "weak_password") return "Choose a longer password, at least 8 characters.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many tries. Wait a minute and try again.";
  }
  if (code === "email_not_confirmed") {
    return "This email isn't confirmed yet. Check your inbox, or turn off email confirmation in Supabase.";
  }
  console.error("auth error:", code ?? "unknown", message);
  return "Something went wrong on our side. Try again in a minute.";
}

export async function authenticate(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const state: AuthState = { email };
  if (!email || !email.includes("@")) state.emailError = "Enter your email address.";
  if (!password) state.passwordError = "Enter your password.";
  else if (mode === "signup" && password.length < 8) {
    state.passwordError = "Choose a longer password, at least 8 characters.";
  }
  if (state.emailError || state.passwordError) return state;

  const supabase = await createSessionClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { email, formError: friendlyAuthError(error.code, error.message) };
    if (!data.session) {
      return {
        email,
        formError: "Account made, but it needs email confirmation. Turn that off in Supabase or check your inbox.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { email, formError: friendlyAuthError(error.code, error.message) };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
