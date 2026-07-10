import { and, eq, gte } from "drizzle-orm";

import { password } from "../../bun-compat";
import { getContext } from "../../context";
import * as s from "../db-schema";
import type { Session, User } from "../types";
import { getUserById } from "./user";

function toSession(row: typeof s.session.$inferSelect): Session {
  return {
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: row.id,
    impersonatedBy: row.impersonatedBy ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    token: row.token,
    updatedAt: row.updatedAt,
    userAgent: row.userAgent ?? undefined,
    userId: row.userId,
  };
}

export async function authenticate(input: {
  email: string;
  password: string;
}): Promise<{ user: User; session: Session }> {
  const { db, pubsub } = getContext();

  const [userRow] = await db
    .select()
    .from(s.user)
    .where(eq(s.user.email, input.email))
    .limit(1);

  if (!userRow) throw new Error("Invalid credentials");

  const [accountRow] = await db
    .select()
    .from(s.account)
    .where(
      and(
        eq(s.account.userId, userRow.id),
        eq(s.account.providerId, "credential"),
      ),
    )
    .limit(1);

  if (!accountRow?.password) throw new Error("Invalid credentials");

  const valid = await password.verify(input.password, accountRow.password);
  if (!valid) throw new Error("Invalid credentials");

  const user = await getUserById({ id: userRow.id });
  if (!user) throw new Error("User not found");

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [sessionRow] = await db
    .insert(s.session)
    .values({
      expiresAt,
      id: crypto.randomUUID(),
      token,
      userId: user.id,
    })
    .returning();

  if (!sessionRow) throw new Error("Failed to create session");

  const session = toSession(sessionRow);
  await pubsub.publish("session:created", { session, user });
  return { session, user };
}

export async function validateSession(input: {
  token: string;
}): Promise<{ user: User; session: Session } | null> {
  const { db } = getContext();

  const [row] = await db
    .select()
    .from(s.session)
    .where(
      and(
        eq(s.session.token, input.token),
        gte(s.session.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;
  const user = await getUserById({ id: row.userId });
  if (!user) return null;

  return { session: toSession(row), user };
}

export async function invalidateSession(input: {
  sessionId: string;
}): Promise<void> {
  const { db, pubsub } = getContext();
  await db.delete(s.session).where(eq(s.session.id, input.sessionId));
  await pubsub.publish("session:invalidated", { sessionId: input.sessionId });
}
