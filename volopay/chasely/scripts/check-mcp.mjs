// Tries the live MCP endpoint the way Claude would, without needing Claude.
// Run it with the URL from Settings:
//   MCP_URL="http://localhost:3000/api/mcp/..." npm run check:mcp
// It creates one fake checklist called "MCP check", which you can delete from the dashboard.

const url = process.env.MCP_URL;
if (!url) {
  console.error('Set MCP_URL first, like: MCP_URL="http://localhost:3000/api/mcp/..." npm run check:mcp');
  process.exit(1);
}

let nextId = 1;
async function rpc(method, params = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(`${response.status}: ${body.error.message}`);
  return body.result;
}

const callTool = (args) => rpc("tools/call", { name: "create_checklist", arguments: args });

const year = new Date().getUTCFullYear() + 1;

const init = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "chasely-check", version: "1.0.0" },
});
console.log("Connected to:", init.serverInfo.name);

const { tools } = await rpc("tools/list");
console.log("Tools:", tools.map((tool) => tool.name).join(", "));

console.log("\n--- Bad input (should save nothing) ---");
const bad = await callTool({
  client_name: "MCP check",
  client_email: "not-an-email",
  due_date: "2020-01-01",
  items: [],
});
console.log(bad.content[0].text);

console.log("\n--- Trying to set a status (should be refused) ---");
const status = await callTool({
  client_name: "MCP check",
  due_date: `${year}-12-15`,
  items: [{ title: "Form 16", note: "Shows salary.", status: "received" }],
});
console.log(status.content[0].text);

console.log("\n--- Good input (creates one checklist) ---");
const good = await callTool({
  client_name: "MCP check",
  due_date: `${year}-12-15`,
  items: [
    { title: "Form 16 from employer", note: "Shows your salary and the tax already paid." },
    { title: "Rent receipts", note: "Needed to report your rental income." },
  ],
});
console.log(good.content[0].text);

const passed = bad.isError === true && status.isError === true && !good.isError;
console.log(passed ? "\nAll good." : "\nSomething didn't behave as expected. See above.");
process.exit(passed ? 0 : 1);
