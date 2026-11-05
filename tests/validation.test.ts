import { describe, expect, it } from "vitest";
import { dueDateError, earliestToday, validateCreateChecklist } from "@/lib/validation";

const NOW = new Date("2026-11-05T12:00:00Z");
const good = {
  client_name: "Ravi Kumar",
  due_date: "2026-12-15",
  items: [{ title: "Form 16", note: "Shows salary and tax paid." }],
};

function errorsFor(overrides: object) {
  const result = validateCreateChecklist({ ...good, ...overrides }, NOW);
  return result.ok ? [] : result.errors;
}

describe("validateCreateChecklist", () => {
  it("accepts good input and trims it", () => {
    const result = validateCreateChecklist(
      { ...good, client_name: "  Ravi  ", client_email: " ravi@example.com " },
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        client_name: "Ravi",
        client_email: "ravi@example.com",
        due_date: "2026-12-15",
        items: good.items,
      },
    });
  });

  it("allows a missing or blank email", () => {
    for (const client_email of [undefined, null, "", "   "]) {
      const result = validateCreateChecklist({ ...good, client_email }, NOW);
      expect(result.ok && result.value.client_email).toBeNull();
    }
  });

  it("rejects a past due date and says what today is", () => {
    const [error] = errorsFor({ due_date: "2025-12-15" });
    expect(error).toContain("in the past");
    expect(error).toContain("2026-11-05");
  });

  it.each(["Dec 15", "15/12/2026", "2026-13-01", "2026-02-30", "20261215", ""])(
    "rejects the bad date %j",
    (due_date) => {
      expect(errorsFor({ due_date }).join()).toMatch(/valid date|real calendar date/);
    },
  );

  it("rejects a date that looks like a typo", () => {
    expect(errorsFor({ due_date: "2062-12-15" }).join()).toContain("typo");
  });

  it("rejects zero items and more than 40 items", () => {
    expect(errorsFor({ items: [] }).join()).toContain("at least 1 item");
    const items = Array.from({ length: 41 }, (_, i) => ({ title: `Doc ${i}`, note: "" }));
    expect(errorsFor({ items }).join()).toContain("You sent 41 items");
  });

  it("accepts exactly 40 items", () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ title: `Doc ${i}`, note: "" }));
    expect(validateCreateChecklist({ ...good, items }, NOW).ok).toBe(true);
  });

  it.each(["not-an-email", "a@b", "Ravi <ravi@example.com>", "a@x.com, b@y.com", "a@x.com;b@y.com"])(
    "rejects the bad email %j",
    (client_email) => {
      expect(errorsFor({ client_email }).join()).toContain("isn't a valid email");
    },
  );

  it("rejects long titles and notes, naming the item", () => {
    const errors = errorsFor({
      items: [good.items[0], { title: "x".repeat(81), note: "y".repeat(301) }],
    });
    expect(errors.join()).toContain("Item 2 title is 81 characters");
    expect(errors.join()).toContain("Item 2 note is 301 characters");
  });

  it("rejects line breaks in a title", () => {
    expect(errorsFor({ items: [{ title: "Form\n16", note: "" }] }).join()).toContain("line breaks");
  });

  it.each(["status", "sent_at", "received_at", "client_note"])(
    "refuses to let Claude set %s on an item",
    (field) => {
      const errors = errorsFor({ items: [{ ...good.items[0], [field]: "received" }] });
      expect(errors.join()).toContain("Only the client can mark an item sent");
    },
  );

  it("refuses status fields at the top level too", () => {
    expect(errorsFor({ status: "received" }).join()).toContain("Only the client can mark");
  });

  it("reports every problem at once", () => {
    const result = validateCreateChecklist({ due_date: "soon", items: "x" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(3);
  });

  it("handles input that isn't an object", () => {
    for (const input of [null, "text", 5, []]) {
      expect(validateCreateChecklist(input, NOW).ok).toBe(false);
    }
  });
});

describe("due dates and time zones", () => {
  it("still counts today as valid where it's still today, up to UTC-12", () => {
    const earlyUtc = new Date("2026-11-06T03:00:00Z");
    expect(earliestToday(earlyUtc)).toBe("2026-11-05");
    expect(dueDateError("2026-11-05", earlyUtc)).toBeNull();
    expect(dueDateError("2026-11-04", earlyUtc)).toContain("in the past");
  });
});
