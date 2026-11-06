// Shared by the MCP tool and the web forms, so both follow the same rules.
// Every message is written to be read by Claude or a person and acted on.

export const LIMITS = {
  clientName: 120,
  email: 254,
  title: 80,
  note: 300,
  clientNote: 500,
  minItems: 1,
  maxItems: 40,
  maxYearsAhead: 5,
} as const;

// Fields that hold progress. Only the client and the accountant may set these.
const STATUS_FIELDS = new Set(["status", "sent_at", "received_at", "client_note"]);

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_FORMAT = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARS_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/;

/**
 * Today's date in the last time zone on earth to reach it (UTC-12).
 * A due date only counts as past once it has passed everywhere, so an accountant
 * in any time zone can always pick their own "today".
 */
export function earliestToday(now: Date = new Date()): string {
  return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Checks the format and that the day exists. Returns an error, or null if fine. */
export function dateFormatError(value: unknown, label = "due_date"): string | null {
  const hint = "Use the format YYYY-MM-DD, for example 2026-12-15.";
  if (typeof value !== "string" || !DATE_FORMAT.test(value.trim())) {
    return `${label} ${typeof value === "string" ? `"${value}"` : "is missing or"} isn't a valid date. ${hint}`;
  }
  const clean = value.trim();
  const parsed = new Date(`${clean}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== clean) {
    return `${label} "${clean}" isn't a real calendar date. ${hint}`;
  }
  return null;
}

/** Full check for a new due date: right format, not past, not absurdly far off. */
export function dueDateError(value: unknown, now: Date = new Date(), label = "due_date"): string | null {
  const formatError = dateFormatError(value, label);
  if (formatError) return formatError;
  const clean = (value as string).trim();
  const today = earliestToday(now);
  if (clean < today) {
    return `${label} ${clean} is in the past. Today is ${today}. Pick today or a later date. If the user gave no year, use the next time that date comes around.`;
  }
  const latest = `${Number(today.slice(0, 4)) + LIMITS.maxYearsAhead}${today.slice(4)}`;
  if (clean > latest) {
    return `${label} ${clean} is more than ${LIMITS.maxYearsAhead} years away, which looks like a typo. Check the year.`;
  }
  return null;
}

export function emailError(value: string, label = "client_email"): string | null {
  if (value.length > LIMITS.email || !EMAIL_FORMAT.test(value)) {
    return `${label} "${value}" isn't a valid email address. Give one plain address, like ravi@example.com, with no name or second address.`;
  }
  return null;
}

export function clientNameError(value: unknown, label = "client_name"): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return `${label} is missing. Give the client's name.`;
  }
  const clean = value.trim();
  if (clean.length > LIMITS.clientName) {
    return `${label} is ${clean.length} characters. The limit is ${LIMITS.clientName}.`;
  }
  if (CONTROL_CHARS.test(clean)) {
    return `${label} has line breaks or hidden characters. Use one plain line of text.`;
  }
  return null;
}

export function titleError(value: unknown, label = "title"): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return `${label} is missing. Every item needs a short title.`;
  }
  const clean = value.trim();
  if (clean.length > LIMITS.title) {
    return `${label} is ${clean.length} characters. The limit is ${LIMITS.title}. Shorten it and put the reason in the note.`;
  }
  if (CONTROL_CHARS.test(clean)) {
    return `${label} has line breaks or hidden characters. Use one plain line of text.`;
  }
  return null;
}

export function noteError(value: unknown, label = "note"): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return `${label} must be text.`;
  const clean = value.trim();
  if (clean.length > LIMITS.note) {
    return `${label} is ${clean.length} characters. The limit is ${LIMITS.note}. Keep it to one or two sentences.`;
  }
  if (CONTROL_CHARS_EXCEPT_NEWLINE.test(clean)) {
    return `${label} has hidden characters. Use plain text.`;
  }
  return null;
}

export type CreateChecklistInput = {
  client_name: string;
  client_email: string | null;
  due_date: string;
  items: { title: string; note: string }[];
};

export type ValidationResult =
  | { ok: true; value: CreateChecklistInput }
  | { ok: false; errors: string[] };

function unknownFieldErrors(
  record: Record<string, unknown>,
  allowed: readonly string[],
  where: string,
): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record)) {
    if (allowed.includes(key)) continue;
    if (STATUS_FIELDS.has(key)) {
      errors.push(
        `${where} has "${key}", which can't be set here. Only the client can mark an item sent, and only the accountant can mark it received. Remove "${key}" and try again.`,
      );
    } else {
      errors.push(`${where} has an unknown field "${key}". Allowed fields: ${allowed.join(", ")}.`);
    }
  }
  return errors;
}

/**
 * Checks a whole create_checklist call and reports every problem at once,
 * so Claude can fix them all in a single retry.
 */
export function validateCreateChecklist(input: unknown, now: Date = new Date()): ValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      ok: false,
      errors: ["The tool needs an object with client_name, due_date and items."],
    };
  }
  const args = input as Record<string, unknown>;
  const errors = unknownFieldErrors(
    args,
    ["client_name", "client_email", "due_date", "items"],
    "The request",
  );

  const nameProblem = clientNameError(args.client_name);
  if (nameProblem) errors.push(nameProblem);

  // A blank email means "no email". That's allowed: reminders will explain what's needed.
  let email: string | null = null;
  if (args.client_email !== undefined && args.client_email !== null) {
    if (typeof args.client_email !== "string") {
      errors.push("client_email must be text. Leave it out if the user didn't give one.");
    } else if (args.client_email.trim()) {
      email = args.client_email.trim();
      const emailProblem = emailError(email);
      if (emailProblem) errors.push(emailProblem);
    }
  }

  const dateProblem = dueDateError(args.due_date, now);
  if (dateProblem) errors.push(dateProblem);

  const items: { title: string; note: string }[] = [];
  if (!Array.isArray(args.items)) {
    errors.push("items is missing. Send a list of 1 to 40 items, each with a title and a note.");
  } else if (args.items.length < LIMITS.minItems) {
    errors.push("items is empty. A checklist needs at least 1 item.");
  } else if (args.items.length > LIMITS.maxItems) {
    errors.push(
      `You sent ${args.items.length} items. The limit is ${LIMITS.maxItems} per checklist. Combine or cut items to fit.`,
    );
  } else {
    args.items.forEach((raw, index) => {
      const where = `Item ${index + 1}`;
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        errors.push(`${where} must be an object with a title and a note, not plain text.`);
        return;
      }
      const item = raw as Record<string, unknown>;
      errors.push(...unknownFieldErrors(item, ["title", "note"], where));
      const titleProblem = titleError(item.title, `${where} title`);
      if (titleProblem) errors.push(titleProblem);
      const noteProblem = noteError(item.note, `${where} note`);
      if (noteProblem) errors.push(noteProblem);
      if (!titleProblem && !noteProblem) {
        items.push({
          title: (item.title as string).trim(),
          note: typeof item.note === "string" ? item.note.trim() : "",
        });
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      client_name: (args.client_name as string).trim(),
      client_email: email,
      due_date: (args.due_date as string).trim(),
      items,
    },
  };
}

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_FORMAT.test(value);
}

// Client links use newToken(): 32 random bytes, which is 43 base64url characters.
const PUBLIC_TOKEN_FORMAT = /^[A-Za-z0-9_-]{32,128}$/;

export function isPublicToken(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_TOKEN_FORMAT.test(value);
}

/** Checks a note the client writes on the client page. Blank is fine and clears it. */
export function clientNoteError(value: unknown): string | null {
  if (typeof value !== "string") return "Your note must be text.";
  const clean = value.trim();
  if (clean.length > LIMITS.clientNote) {
    return `Your note is ${clean.length} characters. The limit is ${LIMITS.clientNote}.`;
  }
  if (CONTROL_CHARS_EXCEPT_NEWLINE.test(clean)) {
    return "Your note has hidden characters. Type it again as plain text.";
  }
  return null;
}
