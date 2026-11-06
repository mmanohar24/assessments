import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// Runs the real migration on an in-memory Postgres, with a small stand-in for the
// parts Supabase provides (auth.users, auth.uid(), the roles and default grants).

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";

let db: PGlite;

async function as<T>(user: string | null, run: () => Promise<T>): Promise<T> {
  await db.exec(user ? `set role authenticated; set app.uid = '${user}';` : "set role anon;");
  try {
    return await run();
  } finally {
    await db.exec("reset role; set app.uid = '';");
  }
}

async function createChecklist(owner = ALICE): Promise<string> {
  const token = `${owner}-${Math.random()}`.padEnd(40, "x");
  const { rows } = await db.query<{ id: string }>(
    `select public.create_checklist_with_items($1, 'Ravi', null, '2099-01-01', $2,
       '[{"title":"Form 16","note":"Salary"},{"title":"Rent receipts"}]'::jsonb) as id`,
    [owner, token],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public
      grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public
      grant all on functions to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${ALICE}'), ('${BOB}');
  `);
  await db.exec(
    readFileSync(join(__dirname, "../supabase/migrations/20261105000000_step1_schema.sql"), "utf8"),
  );
  await db.exec(
    readFileSync(join(__dirname, "../supabase/migrations/20261106000000_step2_client_page.sql"), "utf8"),
  );
  await db.exec(
    readFileSync(join(__dirname, "../supabase/migrations/20261107000000_step3_reminders.sql"), "utf8"),
  );
});

beforeEach(async () => {
  await db.exec("delete from public.reminder_log; delete from public.checklists; delete from public.rate_limits;");
});

describe("status rules", () => {
  it("creates items as pending, with order kept", async () => {
    const id = await createChecklist();
    const { rows } = await db.query<{ title: string; note: string; status: string; position: number }>(
      "select title, note, status, position from public.items where checklist_id = $1 order by position",
      [id],
    );
    expect(rows).toEqual([
      { title: "Form 16", note: "Salary", status: "pending", position: 1 },
      { title: "Rent receipts", note: "", status: "pending", position: 2 },
    ]);
  });

  it("ignores status fields hidden in the create payload", async () => {
    const { rows } = await db.query<{ id: string }>(
      `select public.create_checklist_with_items($1, 'Ravi', null, '2099-01-01', $2,
        '[{"title":"Form 16","status":"received","sent_at":"2026-01-01","received_at":"2026-01-01"}]'::jsonb) as id`,
      [ALICE, "t".repeat(40)],
    );
    const items = await db.query<{ status: string; sent_at: string | null; received_at: string | null }>(
      "select status, sent_at, received_at from public.items where checklist_id = $1",
      [rows[0].id],
    );
    expect(items.rows[0]).toEqual({ status: "pending", sent_at: null, received_at: null });
  });

  it("works out status from the two separate fields", async () => {
    const id = await createChecklist();
    await db.query("update public.items set sent_at = now() where checklist_id = $1", [id]);
    let { rows } = await db.query<{ status: string }>(
      "select status from public.items where checklist_id = $1",
      [id],
    );
    expect(rows.every((r) => r.status === "sent")).toBe(true);
    await db.query("update public.items set received_at = now() where checklist_id = $1", [id]);
    ({ rows } = await db.query<{ status: string }>(
      "select status from public.items where checklist_id = $1",
      [id],
    ));
    expect(rows.every((r) => r.status === "received")).toBe(true);
  });

  it("does not let anyone write status directly, even the server", async () => {
    await createChecklist();
    await expect(db.exec("update public.items set status = 'received'")).rejects.toThrow();
  });

  it("lets received be set on a pending item, and undoing it goes back to pending", async () => {
    const id = await createChecklist();
    const statuses = async () =>
      (await db.query<{ status: string }>("select status from public.items where checklist_id = $1", [id])).rows;
    await db.query("update public.items set received_at = now() where checklist_id = $1", [id]);
    expect((await statuses()).every((r) => r.status === "received")).toBe(true);
    await db.query("update public.items set received_at = null where checklist_id = $1", [id]);
    expect((await statuses()).every((r) => r.status === "pending")).toBe(true);
  });
});

describe("accountant permissions", () => {
  it("cannot set sent_at or client_note, which belong to the client", async () => {
    await createChecklist();
    await as(ALICE, async () => {
      await expect(db.exec("update public.items set sent_at = now()")).rejects.toThrow(/permission denied/);
      await expect(db.exec("update public.items set client_note = 'x'")).rejects.toThrow(/permission denied/);
    });
  });

  it("can set received_at on a pending item the client never ticked", async () => {
    await createChecklist();
    await as(ALICE, () => db.exec("update public.items set received_at = now()"));
    const { rows } = await db.query<{ status: string }>("select status from public.items");
    expect(rows.every((r) => r.status === "received")).toBe(true);
  });

  it("can set received_at on an item the client has sent", async () => {
    const id = await createChecklist();
    await db.query("update public.items set sent_at = now() where checklist_id = $1", [id]);
    await as(ALICE, () => db.exec("update public.items set received_at = now()"));
    const { rows } = await db.query<{ status: string }>("select status from public.items");
    expect(rows.every((r) => r.status === "received")).toBe(true);
  });

  it("cannot change the public token, owner or reminder time, or insert checklists directly", async () => {
    await createChecklist();
    await as(ALICE, async () => {
      await expect(db.exec("update public.checklists set public_token = 'x'")).rejects.toThrow(/permission denied/);
      await expect(db.exec(`update public.checklists set owner_id = '${BOB}'`)).rejects.toThrow(/permission denied/);
      await expect(db.exec("update public.checklists set last_reminder_at = now()")).rejects.toThrow(/permission denied/);
      await expect(
        db.exec(`insert into public.checklists (owner_id, client_name, due_date, public_token)
                 values ('${ALICE}', 'x', '2099-01-01', '${"t".repeat(40)}')`),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("cannot call the server-only functions", async () => {
    await as(ALICE, async () => {
      await expect(db.exec("select public.hit_rate_limit('x', 1, 60)")).rejects.toThrow(/permission denied/);
      await expect(
        db.exec(`select public.create_checklist_with_items('${ALICE}', 'x', null, '2099-01-01', '${"t".repeat(40)}', '[]')`),
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("each login sees only its own data", () => {
  it("hides, and blocks changes to, another accountant's checklist", async () => {
    const id = await createChecklist(ALICE);

    await as(BOB, async () => {
      expect((await db.query("select * from public.checklists")).rows).toHaveLength(0);
      expect((await db.query("select * from public.items")).rows).toHaveLength(0);
      expect((await db.query("update public.items set title = 'hacked'")).affectedRows).toBe(0);
      expect((await db.query("delete from public.items")).affectedRows).toBe(0);
      expect((await db.query("delete from public.checklists")).affectedRows).toBe(0);
      await expect(
        db.query("insert into public.items (checklist_id, title, position) values ($1, 'x', 9)", [id]),
      ).rejects.toThrow(/row-level security/);
    });

    const { rows } = await db.query<{ title: string }>(
      "select title from public.items where checklist_id = $1 order by position",
      [id],
    );
    expect(rows[0].title).toBe("Form 16");
  });

  it("lets the owner read and delete, and items go with the checklist", async () => {
    await createChecklist(ALICE);
    await as(ALICE, async () => {
      expect((await db.query("select * from public.items")).rows).toHaveLength(2);
      await db.exec("delete from public.checklists");
    });
    expect((await db.query("select * from public.items")).rows).toHaveLength(0);
  });

  it("gives logged-out visitors nothing at all", async () => {
    await createChecklist();
    await as(null, async () => {
      await expect(db.query("select * from public.checklists")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.items")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.mcp_tokens")).rejects.toThrow(/permission denied/);
    });
  });

  it("never lets an accountant read a token hash", async () => {
    await db.query("insert into public.mcp_tokens (user_id, token_hash) values ($1, 'hash')", [ALICE]);
    await as(ALICE, async () => {
      expect((await db.query("select created_at from public.mcp_tokens")).rows).toHaveLength(1);
      await expect(db.query("select token_hash from public.mcp_tokens")).rejects.toThrow(/permission denied/);
    });
    await db.exec("delete from public.mcp_tokens");
  });
});

describe("create function and rate limit", () => {
  it("saves nothing if any item is bad", async () => {
    await expect(
      db.query(
        `select public.create_checklist_with_items($1, 'Ravi', null, '2099-01-01', $2, $3::jsonb)`,
        [ALICE, "t".repeat(40), JSON.stringify([{ title: "ok" }, { title: "x".repeat(81) }])],
      ),
    ).rejects.toThrow();
    expect((await db.query("select * from public.checklists")).rows).toHaveLength(0);
  });

  it("allows hits up to the limit, then blocks", async () => {
    const hit = async () =>
      (await db.query<{ ok: boolean }>("select public.hit_rate_limit('k', 2, 3600) as ok")).rows[0].ok;
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(false);
  });
});

describe("client page functions", () => {
  async function setup() {
    const token = "c".repeat(43);
    const { rows } = await db.query<{ id: string }>(
      `select public.create_checklist_with_items($1, 'Ravi', null, '2099-01-01', $2,
         '[{"title":"Form 16"},{"title":"Rent receipts"}]'::jsonb) as id`,
      [ALICE, token],
    );
    const items = await db.query<{ id: string }>(
      "select id from public.items where checklist_id = $1 order by position",
      [rows[0].id],
    );
    return { token, checklistId: rows[0].id, itemId: items.rows[0].id, otherItemId: items.rows[1].id };
  }
  const sent = async (token: string, item: string, value: boolean) =>
    (await db.query<{ r: string }>("select public.client_set_sent($1, $2, $3) as r", [token, item, value])).rows[0].r;
  const note = async (token: string, item: string, value: string) =>
    (await db.query<{ r: string }>("select public.client_set_note($1, $2, $3) as r", [token, item, value])).rows[0].r;
  const row = async (item: string) =>
    (
      await db.query<{ status: string; client_note: string | null; received_at: string | null }>(
        "select status, client_note, received_at from public.items where id = $1",
        [item],
      )
    ).rows[0];

  it("ticks and unticks an item", async () => {
    const { token, itemId } = await setup();
    expect(await sent(token, itemId, true)).toBe("sent");
    expect((await row(itemId)).status).toBe("sent");
    expect(await sent(token, itemId, false)).toBe("pending");
    expect((await row(itemId)).status).toBe("pending");
  });

  it("can never set received, and leaves received items alone", async () => {
    const { token, itemId } = await setup();
    await sent(token, itemId, true);
    expect((await row(itemId)).received_at).toBeNull();
    await db.query("update public.items set received_at = now() where id = $1", [itemId]);
    expect(await sent(token, itemId, false)).toBe("received");
    expect(await note(token, itemId, "late note")).toBe("received");
    expect(await row(itemId)).toMatchObject({ status: "received", client_note: null });
  });

  it("saves, trims and clears a note, and refuses one over 500 characters", async () => {
    const { token, itemId } = await setup();
    expect(await note(token, itemId, "  Sent by email  ")).toBe("pending");
    expect((await row(itemId)).client_note).toBe("Sent by email");
    await note(token, itemId, "   ");
    expect((await row(itemId)).client_note).toBeNull();
    await expect(note(token, itemId, "x".repeat(501))).rejects.toThrow();
  });

  it("changes nothing on a closed checklist", async () => {
    const { token, checklistId, itemId } = await setup();
    await db.query("update public.checklists set is_closed = true where id = $1", [checklistId]);
    expect(await sent(token, itemId, true)).toBe("closed");
    expect(await note(token, itemId, "hi")).toBe("closed");
    expect(await row(itemId)).toMatchObject({ status: "pending", client_note: null });
  });

  it("only works with the right token, on that checklist's own items", async () => {
    const { token, itemId } = await setup();
    expect(await sent("w".repeat(43), itemId, true)).toBe("not_found");
    const other = await createChecklist(BOB);
    const bobItem = (
      await db.query<{ id: string }>("select id from public.items where checklist_id = $1 limit 1", [other])
    ).rows[0].id;
    expect(await sent(token, bobItem, true)).toBe("not_found");
    expect((await row(bobItem)).status).toBe("pending");
  });

  it("can't be called by anon or logged-in users directly", async () => {
    const { token, itemId } = await setup();
    await as(null, () =>
      expect(db.query("select public.client_set_sent($1, $2, true)", [token, itemId])).rejects.toThrow(/permission denied/),
    );
    await as(ALICE, () =>
      expect(db.query("select public.client_set_note($1, $2, 'x')", [token, itemId])).rejects.toThrow(/permission denied/),
    );
  });
});

describe("reminder claims", () => {
  type Claim = { result: string; log_id?: string; previous?: string | null; next_at?: string };
  const claim = async (checklist: string, owner = ALICE, accountCap = 5, globalCap = 30) =>
    (
      await db.query<{ r: Claim }>("select public.claim_reminder($1, $2, $3, $4) as r", [
        owner,
        checklist,
        accountCap,
        globalCap,
      ])
    ).rows[0].r;
  const lastReminder = async (checklist: string) =>
    (await db.query<{ t: string | null }>("select last_reminder_at as t from public.checklists where id = $1", [checklist]))
      .rows[0].t;
  async function withEmail(owner = ALICE) {
    const id = await createChecklist(owner);
    await db.query("update public.checklists set client_email = 'ravi@example.com' where id = $1", [id]);
    return id;
  }

  it("claims once, and a second claim right away is refused with the next time", async () => {
    const id = await withEmail();
    const first = await claim(id);
    expect(first.result).toBe("ok");
    expect(first.previous).toBeNull();
    expect(await lastReminder(id)).not.toBeNull();
    const second = await claim(id);
    expect(second.result).toBe("too_soon");
    expect(new Date(second.next_at!).getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
  });

  it("allows another claim once 24 hours have passed", async () => {
    const id = await withEmail();
    await db.query("update public.checklists set last_reminder_at = now() - interval '25 hours' where id = $1", [id]);
    expect((await claim(id)).result).toBe("ok");
  });

  it("releasing puts last_reminder_at back and frees the cap", async () => {
    const id = await withEmail();
    await db.query("update public.checklists set last_reminder_at = '2026-01-01T00:00:00Z' where id = $1", [id]);
    const first = await claim(id, ALICE, 1);
    expect(first.result).toBe("ok");
    await db.query("select public.release_reminder($1, $2, $3, $4)", [ALICE, id, first.log_id, first.previous]);
    expect(new Date((await lastReminder(id))!).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect((await claim(id, ALICE, 1)).result).toBe("ok");
  });

  it("refuses closed, no email, all received and other people's checklists", async () => {
    const noEmail = await createChecklist();
    expect((await claim(noEmail)).result).toBe("no_email");

    const closed = await withEmail();
    await db.query("update public.checklists set is_closed = true where id = $1", [closed]);
    expect((await claim(closed)).result).toBe("closed");

    const done = await withEmail();
    await db.query("update public.items set received_at = now() where checklist_id = $1", [done]);
    expect((await claim(done)).result).toBe("all_received");

    const bobs = await withEmail(BOB);
    expect((await claim(bobs, ALICE)).result).toBe("not_found");
    expect(await lastReminder(bobs)).toBeNull();
  });

  it("stops at the per-account cap, then at the overall cap", async () => {
    const a1 = await withEmail();
    const a2 = await withEmail();
    expect((await claim(a1, ALICE, 1)).result).toBe("ok");
    expect((await claim(a2, ALICE, 1)).result).toBe("account_cap");
    const b1 = await withEmail(BOB);
    expect((await claim(b1, BOB, 5, 1)).result).toBe("global_cap");
    expect(await lastReminder(a2)).toBeNull();
    expect(await lastReminder(b1)).toBeNull();
  });

  it("can't be called by logged-in users, who also can't set last_reminder_at", async () => {
    const id = await withEmail();
    await as(ALICE, async () => {
      await expect(db.query("select public.claim_reminder($1, $2, 5, 30)", [ALICE, id])).rejects.toThrow(/permission denied/);
      await expect(db.exec("update public.checklists set last_reminder_at = null")).rejects.toThrow(/permission denied/);
      await expect(db.exec("select * from public.reminder_log")).rejects.toThrow(/permission denied/);
    });
  });
});
