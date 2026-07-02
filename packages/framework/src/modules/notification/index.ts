import { eq } from "drizzle-orm";
import { getDrizzle, getPool } from "../../lib/db";
import * as schema from "./schema";
import { createNotificationQueryService } from "./service";
import type {
	NotificationConfig,
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
): NotificationModule {
	const pool = getPool(config.database);
	const db = getDrizzle(config.database, schema);
	const queryService = createNotificationQueryService(db);

	const providers = new Map<string, NotificationProvider>();
	for (const provider of config.providers) {
		providers.set(provider.type, provider);
	}

	async function initialize(): Promise<void> {
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

	async function destroy(): Promise<void> {}

	async function send(
		type: NotificationType,
		payload: NotificationPayload,
	): Promise<NotificationRecord> {
		const provider = providers.get(type);
		if (!provider) throw new Error(`No provider registered for type "${type}"`);

		const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
		let lastRecord: NotificationRecord | null = null;

		for (const recipient of recipients) {
			const [row] = await db
				.insert(schema.notifications)
				.values({
					type,
					to: recipient,
					subject: payload.subject ?? null,
					body: payload.body,
					provider: type,
					data: payload.data ?? {},
				})
				.returning();

			try {
				await provider.send({ ...payload, to: recipient });
				await db
					.update(schema.notifications)
					.set({ status: "sent", sentAt: new Date() })
					.where(eq(schema.notifications.id, row!.id));
				lastRecord = {
					id: row!.id,
					type: row!.type,
					to: row!.to,
					subject: row!.subject ?? undefined,
					body: row!.body,
					status: "sent",
					provider: row!.provider,
					sentAt: new Date(),
					createdAt: row!.createdAt,
				};
			} catch (err) {
				const error = err instanceof Error ? err.message : String(err);
				await db
					.update(schema.notifications)
					.set({ status: "failed", error })
					.where(eq(schema.notifications.id, row!.id));
				lastRecord = {
					id: row!.id,
					type: row!.type,
					to: row!.to,
					subject: row!.subject ?? undefined,
					body: row!.body,
					status: "failed",
					provider: row!.provider,
					error,
					createdAt: row!.createdAt,
				};
			}
		}

		return lastRecord!;
	}

	return {
		initialize,
		destroy,
		send,
		sendEmail: (to, subject, body, html) =>
			send("email", { to, subject, body, html }),
		sendSms: (to, body) => send("sms", { to, body }),
		sendPush: (to, title, body, data) =>
			send("push", { to, subject: title, body, data }),
		sendWebhook: (url, data) =>
			send("webhook", { to: url, body: JSON.stringify(data), data }),
		getHistory: queryService.getHistory,
		getStatus: queryService.getStatus,
	};
}
