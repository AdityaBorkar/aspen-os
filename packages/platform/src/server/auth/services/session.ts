import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";

import * as s from "../db-schema";
import type { AuthServiceDeps, Session, User } from "../index";
import { toSession, toUser } from "../utils/mappers";

async function createHeadersFromToken(
  token: string,
  { auth }: { auth: AuthServiceDeps["auth"] },
): Promise<Headers> {
  const ctx = await auth.$context;
  const signature = createHmac("sha256", ctx.secret).update(token).digest("base64");
  const signedValue = encodeURIComponent(`${token}.${signature}`);
  const headers = new Headers();
  headers.set("cookie", `${ctx.authCookies.sessionToken.name}=${signedValue}`);
  return headers;
}

export async function authenticate(
  input: { email: string; password: string },
  { auth, pubsub }: AuthServiceDeps,
): Promise<{ session: Session; user: User }> {
  const response = await auth.api.signInEmail({
    body: { email: input.email, password: input.password },
  });

  if ("twoFactorRedirect" in response) {
    throw new Error("Two-factor authentication required");
  }

  const headers = await createHeadersFromToken(response.token, { auth });
  const sessionData = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });

  if (!sessionData) {
    throw new Error("Failed to create session");
  }

  const session = toSession(sessionData.session);
  const user = toUser(sessionData.user);
  await pubsub?.publish("session:created", { session, user });
  return { session, user };
}

export async function validateSession(
  input: { token: string },
  { auth }: AuthServiceDeps,
): Promise<{ session: Session; user: User } | null> {
  const headers = await createHeadersFromToken(input.token, { auth });
  const sessionData = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });

  if (!sessionData) {
    return null;
  }

  return {
    session: toSession(sessionData.session),
    user: toUser(sessionData.user),
  };
}

export async function invalidateSession(
  input: { sessionId: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.delete(s.session).where(eq(s.session.id, input.sessionId));
  await pubsub?.publish("session:invalidated", {
    sessionId: input.sessionId,
  });
}
