import { and, eq } from "drizzle-orm";

import { getContext } from "../../../lib/context";
import * as s from "../db-schema";
import type { Session, User } from "../types";
import { getUserById } from "./user";

export async function authenticate(
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> {
  const { db, pubsub } = getContext();
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

  const session: Session = {
    createdAt: sessionRow!.createdAt,
    expiresAt: sessionRow!.expiresAt,
    id: sessionRow!.id,
    token: sessionRow!.token,
    userId: sessionRow!.userId,
  };

  await pubsub.publish("session:created", { session, user });
  return { session, user };
}

export async function validateSession(
  token: string,
): Promise<{ user: User; session: Session } | null> {
  const { db } = getContext();
  const [row] = await db
    .select()
    .from(s.authSessions)
    .where(
      and(
        eq(s.authSessions.token, token),
        eq(s.authSessions.expiresAt, new Date()),
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

export async function invalidateSession(sessionId: string): Promise<void> {
  const { db, pubsub } = getContext();
  await db.delete(s.authSessions).where(eq(s.authSessions.id, sessionId));
  await pubsub.publish("session:invalidated", { sessionId });
}
