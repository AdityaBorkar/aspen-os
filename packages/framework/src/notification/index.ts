import { eq } from "drizzle-orm";

import { createDrizzle } from "../db";
import type { Module, ModuleDeps } from "../types";
import * as schema from "./schema";
import { createNotificationQueryService } from "./service";
import type {
  NotificationConfig,
  NotificationHistoryOptions,
  NotificationModule,
  NotificationPayload,
  NotificationProvider,
  NotificationRecord,
  NotificationType,
} from "./types";

export type {
  NotificationConfig,
  NotificationHistoryOptions,
  NotificationModule,
  NotificationPayload,
  NotificationProvider,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
} from "./types";

export function createNotificationModule(
  config: NotificationConfig,
): NotificationModule & Module {
  const providers = new Map<string, NotificationProvider>();
  for (const provider of config.providers) {
    providers.set(provider.type, provider);
  }

  let pool: import("pg").Pool | null = null;
  let db: ReturnType<typeof createDrizzle> | null = null;
  let queryService: ReturnType<typeof createNotificationQueryService> | null =
    null;

  async function initialize(deps: ModuleDeps): Promise<void> {
    pool = deps.pool;
    db = createDrizzle(deps.pool, schema);
    queryService = createNotificationQueryService(db);

    await pool.query(`
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
  }

  async function destroy(): Promise<void> {
    queryService = null;
    db = null;
    pool = null;
  }

  async function healthCheck(): Promise<boolean> {
    return db !== null;
  }

  function requireDb() {
    if (!db || !queryService)
      throw new Error("Notification module not initialized");
    return { db, queryService };
  }

  async function send(
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<NotificationRecord> {
    const { db: database, queryService: qs } = requireDb();
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

      try {
        await provider.send({ ...payload, to: recipient });
        await database
          .update(schema.notifications)
          .set({ sentAt: new Date(), status: "sent" })
          .where(eq(schema.notifications.id, row?.id));
        lastRecord = {
          body: row?.body,
          createdAt: row?.createdAt,
          id: row?.id,
          provider: row?.provider,
          sentAt: new Date(),
          status: "sent",
          subject: row?.subject ?? undefined,
          to: row?.to,
          type: row?.type,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await database
          .update(schema.notifications)
          .set({ error, status: "failed" })
          .where(eq(schema.notifications.id, row?.id));
        lastRecord = {
          body: row?.body,
          createdAt: row?.createdAt,
          error,
          id: row?.id,
          provider: row?.provider,
          status: "failed",
          subject: row?.subject ?? undefined,
          to: row?.to,
          type: row?.type,
        };
      }
    }

    return lastRecord!;
  }

  return {
    destroy,
    getHistory: (options?: NotificationHistoryOptions) =>
      requireDb().queryService.getHistory(options),
    getStatus: (id: string) => requireDb().queryService.getStatus(id),
    healthCheck,
    initialize,
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
