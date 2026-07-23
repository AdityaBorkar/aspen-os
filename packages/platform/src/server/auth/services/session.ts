import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";

import * as s from "../db-schema";
import type { AuthServiceDeps, Session, User } from "../types";

type AuthSession = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  impersonatedBy?: string | null;
  ipAddress?: string | null;
  token: string;
  updatedAt: Date;
  userAgent?: string | null;
  userId: string;
};

type AuthUser = {
  banExpires?: Date | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date;
  displayUsername?: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  image?: string | null;
  name: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
  role?: string | null;
  updatedAt: Date;
  username?: string | null;
};

function toSession(session: AuthSession): Session {
  return {
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    id: session.id,
    impersonatedBy: session.impersonatedBy ?? undefined,
    ipAddress: session.ipAddress ?? undefined,
    token: session.token,
    updatedAt: session.updatedAt,
    userAgent: session.userAgent ?? undefined,
    userId: session.userId,
  };
}

function toUser(user: AuthUser): User {
  return {
    banExpires: user.banExpires ?? undefined,
    banned: user.banned ?? false,
    banReason: user.banReason ?? undefined,
    createdAt: user.createdAt,
    displayUsername: user.displayUsername ?? undefined,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    image: user.image ?? undefined,
    name: user.name,
    phoneNumber: user.phoneNumber ?? undefined,
    phoneNumberVerified: user.phoneNumberVerified ?? undefined,
    role: user.role ?? undefined,
    updatedAt: user.updatedAt,
    username: user.username ?? undefined,
  };
}

export function createSessionServices(deps: AuthServiceDeps) {
  async function createHeadersFromToken(token: string): Promise<Headers> {
    const { auth } = deps;
    const ctx = await auth.$context;
    const signature = createHmac("sha256", ctx.secret)
      .update(token)
      .digest("base64");
    const signedValue = encodeURIComponent(`${token}.${signature}`);
    const headers = new Headers();
    headers.set(
      "cookie",
      `${ctx.authCookies.sessionToken.name}=${signedValue}`,
    );
    return headers;
  }

  async function authenticate(input: {
    email: string;
    password: string;
  }): Promise<{ session: Session; user: User }> {
    const { auth, pubsub } = deps;

    const response = await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
    });

    if ("twoFactorRedirect" in response) {
      throw new Error("Two-factor authentication required");
    }

    const headers = await createHeadersFromToken(response.token);
    const sessionData = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });

    if (!sessionData) throw new Error("Failed to create session");

    const session = toSession(sessionData.session as AuthSession);
    const user = toUser(sessionData.user as AuthUser);

    await pubsub.publishControlPlane("session:created", { session, user });
    return { session, user };
  }

  async function validate(input: {
    token: string;
  }): Promise<{ session: Session; user: User } | null> {
    const { auth } = deps;

    const headers = await createHeadersFromToken(input.token);
    const sessionData = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });

    if (!sessionData) return null;

    return {
      session: toSession(sessionData.session as AuthSession),
      user: toUser(sessionData.user as AuthUser),
    };
  }

  async function invalidate(input: { sessionId: string }): Promise<void> {
    const { db, pubsub } = deps;
    await db.delete(s.session).where(eq(s.session.id, input.sessionId));
    await pubsub.publishControlPlane("session:invalidated", {
      sessionId: input.sessionId,
    });
  }

  return { authenticate, invalidate, validate };
}
