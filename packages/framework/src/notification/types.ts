import type { DatabaseConfig, ModuleDeps } from "../types";

export type NotificationType = "email" | "sms" | "push" | "webhook";
export type NotificationStatus = "pending" | "sent" | "failed" | "delivered";

export interface NotificationConfig {
  database: DatabaseConfig;
  providers: NotificationProvider[];
}

export interface NotificationProvider {
  send(notification: NotificationPayload): Promise<void>;
  type: NotificationType;
}

export interface NotificationPayload {
  body: string;
  channel?: string;
  data?: Record<string, unknown>;
  html?: string;
  subject?: string;
  to: string | string[];
}

export interface NotificationRecord {
  body: string;
  createdAt: Date;
  error?: string;
  id: string;
  provider: string;
  sentAt?: Date;
  status: NotificationStatus;
  subject?: string;
  to: string;
  type: string;
}

export interface NotificationHistoryOptions {
  limit?: number;
  status?: string;
  to?: string;
  type?: string;
}

export interface NotificationModule {
  destroy(): Promise<void>;

  getHistory(
    options?: NotificationHistoryOptions,
  ): Promise<NotificationRecord[]>;
  getStatus(notificationId: string): Promise<NotificationRecord | null>;
  initialize(deps: ModuleDeps): Promise<void>;

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
  sendPush(
    to: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationRecord>;
  sendSms(to: string, body: string): Promise<NotificationRecord>;
  sendWebhook(
    url: string,
    data: Record<string, unknown>,
  ): Promise<NotificationRecord>;
}
