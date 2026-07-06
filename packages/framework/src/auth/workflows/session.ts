import { and, eq, gte } from "drizzle-orm";

import type { UnitDeps } from "../../types";
import * as s from "../db-schema";
import type { Session, User } from "../types";

export function createSessionWorkflows(
  deps: UnitDeps,
  getUserById: (id: string) => Promise<User | null>,
) {
  const { db, pubsub } = deps;

  async function authenticate(
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session }> {
    const [row] = await db
      .select()
      .from(s.authUsers)
      .where(eq(s.authUsers.email, email))
      .limit(1);

    if (!row) throw new Error("Invalid credentials");
    const valid = await Bun.password.verify(password, row.passwordHash);
    if (!valid) throw new Error("Invalid credentials");

    const user = await getUserById(row.id);
    if (!user) throw new Error("User not found");

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [sessionRow] = await db
      .insert(s.authSessions)
      .values({ expiresAt, token, userId: user.id })
      .returning();

    if (!sessionRow) throw new Error("Failed to create session");

    const session: Session = {
      createdAt: sessionRow.createdAt,
      expiresAt: sessionRow.expiresAt,
      id: sessionRow.id,
      token: sessionRow.token,
      userId: sessionRow.userId,
    };

    await pubsub.publish("session:created", { session, user });
    return { session, user };
  }

  async function validateSession(
    token: string,
  ): Promise<{ user: User; session: Session } | null> {
    const [row] = await db
      .select()
      .from(s.authSessions)
      .where(
        and(
          eq(s.authSessions.token, token),
          gte(s.authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) return null;
    const user = await getUserById(row.userId);
    if (!user) return null;

    return {
      session: {
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        id: row.id,
        token: row.token,
        userId: row.userId,
      },
      user,
    };
  }

  async function invalidateSession(sessionId: string): Promise<void> {
    await db.delete(s.authSessions).where(eq(s.authSessions.id, sessionId));
    await pubsub.publish("session:invalidated", { sessionId });
  }

  return { authenticate, invalidateSession, validateSession };
}
