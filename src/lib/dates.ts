import "server-only";
import { headers } from "next/headers";
import { earliestToday } from "@/lib/validation";

/**
 * Formats a date-only value in the visitor's language. Pinned to UTC on both sides
 * so the day can never shift with a time zone.
 */
export async function dateFormatter() {
  const language = (await headers()).get("accept-language")?.split(",")[0]?.trim();
  let locale = "en-US";
  try {
    if (language) locale = Intl.getCanonicalLocales(language)[0];
  } catch {
    // Odd header: stay on the default.
  }
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  return (date: string) => formatter.format(new Date(`${date}T00:00:00Z`));
}

export function isOverdue(dueDate: string, now: Date = new Date()): boolean {
  return dueDate < earliestToday(now);
}
