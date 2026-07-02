import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import type {
	NotificationHistoryOptions,
	NotificationRecord,
	NotificationStatus,
} from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createNotificationQueryService(db: DrizzleDB) {
	async function getHistory(
		options?: NotificationHistoryOptions,
	): Promise<NotificationRecord[]> {
		const conditions = [];
		if (options?.to) conditions.push(eq(s.notifications.to, options.to));
		if (options?.type) conditions.push(eq(s.notifications.type, options.type));
		if (options?.status)
			conditions.push(eq(s.notifications.status, options.status));

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const rows = await db
			.select()
			.from(s.notifications)
			.where(where)
			.orderBy(desc(s.notifications.createdAt))
			.limit(options?.limit ?? 100);

		return rows.map(toRecord);
	}

	async function getStatus(
		notificationId: string,
	): Promise<NotificationRecord | null> {
		const [row] = await db
			.select()
			.from(s.notifications)
			.where(eq(s.notifications.id, notificationId))
			.limit(1);

		return row ? toRecord(row) : null;
	}

	function toRecord(row: {
		id: string;
		type: string;
		to: string;
		subject: string | null;
		body: string;
		status: string;
		provider: string;
		error: string | null;
		sentAt: Date | null;
		createdAt: Date;
	}): NotificationRecord {
		return {
			id: row.id,
			type: row.type,
			to: row.to,
			subject: row.subject ?? undefined,
			body: row.body,
			status: row.status as NotificationStatus,
			provider: row.provider,
			error: row.error ?? undefined,
			sentAt: row.sentAt ?? undefined,
			createdAt: row.createdAt,
		};
	}

	return { getHistory, getStatus };
}
