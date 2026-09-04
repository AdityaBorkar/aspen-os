import type { AuthUnit } from "@aspen-os/platform/server";

export function requireAuth(ctx: { auth?: AuthUnit }): AuthUnit {
  if (!ctx.auth) {
    throw new Error("Auth is required for this operation");
  }
  return ctx.auth;
}
