import { eq } from "drizzle-orm";

import { createDrizzle } from "../db";
import * as schema from "./schema";
import { createNotificationQueryService } from "./service";
import type {
  NotificationConfig,
  NotificationHistoryOptions,
  NotificationPayload,
  NotificationProvider,
  NotificationRecord,
  NotificationType,
  NotificationUnit,
} from "./types";

export type {
  NotificationConfig,
  NotificationHistoryOptions,
  NotificationPayload,
  NotificationProvider,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
  NotificationUnit,
} from "./types";

export function createNotificationUnit(
  config: NotificationConfig,
  pool: import("pg").Pool,
): NotificationUnit {
  const providers = new Map<string, NotificationProvider>();
  for (const provider of config.providers) {
    providers.set(provider.type, provider);
  }

  const db = createDrizzle(pool, schema);
  const queryService = createNotificationQueryService(db);

  // Initialize table synchronously in background
  pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      type TEXT NOT NULL,
      "to" TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL,
      error TEXT,
      data JSONB DEFAULT '{}',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_to ON notifications("to");
  `);

  async function destroy(): Promise<void> {
    // Cleanup if needed
  }

  async function healthCheck(): Promise<boolean> {
    return true;
  }

  function requireDb() {
    return { db, queryService };
  }

  async function send(
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<NotificationRecord> {
    const { db: database } = requireDb();
    const provider = providers.get(type);
    if (!provider) throw new Error(`No provider registered for type "${type}"`);

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    let lastRecord: NotificationRecord | null = null;

    for (const recipient of recipients) {
      const [row] = await database
        .insert(schema.notifications)
        .values({
          body: payload.body,
          data: payload.data ?? {},
          provider: type,
          subject: payload.subject ?? null,
          to: recipient,
          type,
        })
        .returning();

      if (!row) throw new Error("Failed to insert notification");

      try {
        await provider.send({ ...payload, to: recipient });
        await database
          .update(schema.notifications)
          .set({ sentAt: new Date(), status: "sent" })
          .where(eq(schema.notifications.id, row.id));
        lastRecord = {
          body: row.body,
          createdAt: row.createdAt,
          id: row.id,
          provider: row.provider,
          sentAt: new Date(),
          status: "sent",
          subject: row.subject ?? undefined,
          to: row.to,
          type: row.type,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await database
          .update(schema.notifications)
          .set({ error, status: "failed" })
          .where(eq(schema.notifications.id, row.id));
        lastRecord = {
          body: row.body,
          createdAt: row.createdAt,
          error,
          id: row.id,
          provider: row.provider,
          status: "failed",
          subject: row.subject ?? undefined,
          to: row.to,
          type: row.type,
        };
      }
    }

    if (!lastRecord) throw new Error("No recipients processed");
    return lastRecord;
  }

  return {
    destroy,
    getHistory: (options?: NotificationHistoryOptions) =>
      requireDb().queryService.getHistory(options),
    getStatus: (id: string) => requireDb().queryService.getStatus(id),
    healthCheck,
    name: "notification",
    send,
    sendEmail: (to, subject, body, html) =>
      send("email", { body, html, subject, to }),
    sendPush: (to, title, body, data) =>
      send("push", { body, data, subject: title, to }),
    sendSms: (to, body) => send("sms", { body, to }),
    sendWebhook: (url, data) =>
      send("webhook", { body: JSON.stringify(data), data, to: url }),
  };
}
