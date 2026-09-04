export const CHANNEL_TYPE = {
  EMAIL: "email",
  OTHER: "other",
  PUSH: "push",
  SMS: "sms",
  WHATSAPP: "whatsapp",
} as const;

export type ChannelType = (typeof CHANNEL_TYPE)[keyof typeof CHANNEL_TYPE];

export const CHANNEL_SOURCE = {
  HOST: "host",
  TENANT: "tenant",
} as const;

export type ChannelSource = (typeof CHANNEL_SOURCE)[keyof typeof CHANNEL_SOURCE];

export const CHANNEL_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  INACTIVE: "inactive",
  REVOKED: "revoked",
} as const;

export type ChannelStatus = (typeof CHANNEL_STATUS)[keyof typeof CHANNEL_STATUS];

export const PROVIDER_KIND = {
  OTHER: "other",
  POSTMARK: "postmark",
  RESEND: "resend",
  SES: "ses",
  SMTP: "smtp",
  TWILIO: "twilio",
  WHATSAPP_BUSINESS_API: "whatsapp_business_api",
} as const;

export type ProviderKind = (typeof PROVIDER_KIND)[keyof typeof PROVIDER_KIND];

export const RECIPIENT_TYPE = {
  CONTACT: "contact",
  USER: "user",
} as const;

export type RecipientType = (typeof RECIPIENT_TYPE)[keyof typeof RECIPIENT_TYPE];

export const NOTIFICATION_STATUS = {
  DISMISSED: "dismissed",
  READ: "read",
  UNREAD: "unread",
} as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const NOTIFICATION_SEVERITY = {
  IMPORTANT: "important",
  NORMAL: "normal",
  URGENT: "urgent",
} as const;

export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITY)[keyof typeof NOTIFICATION_SEVERITY];

export const MESSAGE_STATUS = {
  DELIVERED: "delivered",
  FAILED: "failed",
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];
