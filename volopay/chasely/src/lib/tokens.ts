import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes: long and unguessable. Used for client links and MCP URLs. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
