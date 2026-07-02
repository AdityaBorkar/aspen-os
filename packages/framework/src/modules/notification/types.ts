import type { DatabaseConfig } from "../../lib/types";

export type NotificationType = "email" | "sms" | "push" | "webhook";
export type NotificationStatus = "pending" | "sent" | "failed" | "delivered";

export interface NotificationConfig {
	database: DatabaseConfig;
	providers: NotificationProvider[];
}

export interface NotificationProvider {
	type: NotificationType;
	send(notification: NotificationPayload): Promise<void>;
}

export interface NotificationPayload {
	to: string | string[];
	subject?: string;
	body: string;
	html?: string;
	data?: Record<string, unknown>;
	channel?: string;
}

export interface NotificationRecord {
	id: string;
	type: string;
	to: string;
	subject?: string;
	body: string;
	status: NotificationStatus;
	provider: string;
	error?: string;
	sentAt?: Date;
	createdAt: Date;
}

export interface NotificationHistoryOptions {
	to?: string;
	type?: string;
	status?: string;
	limit?: number;
}

export interface NotificationModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	send(
		type: NotificationType,
		payload: NotificationPayload,
	): Promise<NotificationRecord>;
	sendEmail(
		to: string | string[],
		subject: string,
		body: string,
		html?: string,
	): Promise<NotificationRecord>;
	sendSms(to: string, body: string): Promise<NotificationRecord>;
	sendPush(
		to: string,
		title: string,
		body: string,
		data?: Record<string, unknown>,
	): Promise<NotificationRecord>;
	sendWebhook(
		url: string,
		data: Record<string, unknown>,
	): Promise<NotificationRecord>;

	getHistory(
		options?: NotificationHistoryOptions,
	): Promise<NotificationRecord[]>;
	getStatus(notificationId: string): Promise<NotificationRecord | null>;
}
