import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { LIMITS, validateCreateChecklist, type CreateChecklistInput } from "@/lib/validation";

// The low level Server is used on purpose. The higher level McpServer rejects bad
// input with its own technical message before our code runs, and the spec needs
// plain-words errors that Claude can act on.

export const CREATE_CHECKLIST_TOOL = {
  name: "create_checklist",
  title: "Create document checklist",
  description: `Save a new document checklist for one of the accountant's clients in Chasely. Chasely gives the client a private link to tick off what they've sent, and shows the accountant the progress.

Use this when the user asks for a document checklist, a list of paperwork to collect, or similar. Work out which documents this client needs from what the user told you (their work, income, country, deadline), then call this tool once.

Before calling:
- You need the client's name and a due date. If the user gave neither or only one, ask for what's missing.
- Only include client_email if the user gave it. Never guess or make one up. It can be added later, but reminders can't be sent without it.
- Dates are date only, as YYYY-MM-DD. If the user gives a day with no year, use the next time that date comes around.

Writing the items:
- title: the document name only, short and clear, like "Form 16 from employer". Maximum ${LIMITS.title} characters.
- note: one or two plain sentences telling the client why it's needed or where to find it. The client reads this on their phone and may not know accounting terms. Maximum ${LIMITS.note} characters.
- Keep each item to one document, in a sensible order. ${LIMITS.minItems} to ${LIMITS.maxItems} items.
- Never ask the client to type account numbers or ID numbers into the checklist.

This tool only creates. You can't set an item's status: only the client can mark an item sent, and only the accountant can mark it received.

Every successful call creates a new checklist, so do not call it twice for the same request. You have no way to delete one. If a call returns an error, nothing was saved: read the error, fix the input and try again. If you can't tell whether a call worked, ask the user to check their Chasely dashboard instead of calling again.

After it works, tell the user exactly what was created (client, due date, number of items) and give them both links. edit_url is for the accountant to review and change the list. client_url is the private link to share with the client. Anyone who has it can tick items, so it should only go to that client.`,
  inputSchema: {
    type: "object" as const,
    properties: {
      client_name: {
        type: "string",
        maxLength: LIMITS.clientName,
        description: "The client's name, as the accountant would write it.",
      },
      client_email: {
        type: "string",
        maxLength: LIMITS.email,
        description: "The client's email, only if the user gave it. One plain address. Leave out otherwise.",
      },
      due_date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "When the documents are due, as YYYY-MM-DD. Today or later.",
      },
      items: {
        type: "array",
        minItems: LIMITS.minItems,
        maxItems: LIMITS.maxItems,
        description: "The documents to collect, in the order the client should see them.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              maxLength: LIMITS.title,
              description: "Short document name. The reason goes in the note.",
            },
            note: {
              type: "string",
              maxLength: LIMITS.note,
              description: "Why it's needed or where to find it, in plain words for the client.",
            },
          },
          required: ["title", "note"],
          additionalProperties: false,
        },
      },
    },
    required: ["client_name", "due_date", "items"],
    additionalProperties: false,
  },
  annotations: {
    title: "Create document checklist",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

export type SavedChecklist = { id: string; publicToken: string };

export type McpContext = {
  baseUrl: string;
  /** Saves for the accountant this URL's token belongs to. Throws if the save fails. */
  saveChecklist: (input: CreateChecklistInput) => Promise<SavedChecklist>;
};

function errorReply(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}

export function buildMcpServer(context: McpContext): Server {
  const server = new Server(
    { name: "chasely", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [CREATE_CHECKLIST_TOOL],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== CREATE_CHECKLIST_TOOL.name) {
      return errorReply(
        `There's no tool called "${request.params.name}". The available tool is ${CREATE_CHECKLIST_TOOL.name}.`,
      );
    }

    const checked = validateCreateChecklist(request.params.arguments ?? {});
    if (!checked.ok) {
      const count = checked.errors.length;
      return errorReply(
        `Nothing was saved. Fix ${count === 1 ? "this problem" : `these ${count} problems`} and try again:\n- ${checked.errors.join("\n- ")}`,
      );
    }

    let saved: SavedChecklist;
    try {
      saved = await context.saveChecklist(checked.value);
    } catch (error) {
      // Log only the message. Never the request, which could include the token.
      console.error("create_checklist failed:", error instanceof Error ? error.message : "unknown");
      return errorReply(
        "Chasely couldn't save the checklist because of a problem on our side. Your input was fine. Ask the user to check their dashboard for it before trying again, so it doesn't get created twice.",
      );
    }

    const { client_name, client_email, due_date, items } = checked.value;
    const result = {
      id: saved.id,
      client_name,
      client_email,
      due_date,
      item_count: items.length,
      edit_url: `${context.baseUrl}/checklists/${saved.id}`,
      client_url: `${context.baseUrl}/c/${saved.publicToken}`,
    };

    const noun = items.length === 1 ? "item" : "items";
    const summary = [
      `Created 1 checklist for ${client_name}, due ${due_date}, with ${items.length} ${noun}.`,
      client_email
        ? `Client email on file: ${client_email}.`
        : "No client email on file, so reminders can't be sent until one is added.",
      `edit_url (for the accountant): ${result.edit_url}`,
      `client_url (private, share only with this client): ${result.client_url}`,
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent: result,
    };
  });

  return server;
}
