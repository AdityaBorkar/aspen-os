import { CHANNEL_TYPE, PROVIDER_KIND } from "@aspen-os/constants";

export {
  CHANNEL_SOURCE,
  CHANNEL_STATUS,
  CHANNEL_TYPE,
  MASTER_ENTITY_TYPE,
  MESSAGE_STATUS,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_STATUS,
  PROVIDER_KIND,
  RECIPIENT_TYPE,
} from "@aspen-os/constants";

export type {
  ChannelSource,
  ChannelStatus,
  ChannelType,
  MasterEntityType,
  MessageStatus,
  NotificationSeverity,
  NotificationStatus,
  ProviderKind,
  RecipientType,
} from "@aspen-os/constants";

export const AUDIT_ENTITY_TYPE = {
  CHANNEL: "comms:channel",
  MESSAGE: "comms:message",
  NOTIFICATION: "comms:notification",
  PREFERENCE: "comms:preference",
  PROVIDER: "comms:provider",
  SETTING: "comms:setting",
  TEMPLATE: "comms:template",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  ACTIVATED: "activated",
  CREATED: "created",
  CREDENTIAL_ROTATED: "credential_rotated",
  DEACTIVATED: "deactivated",
  DEFAULT_SET: "default_set",
  DELETED: "deleted",
  DELIVERED: "delivered",
  DISMISSED: "dismissed",
  FAILED: "failed",
  MARKED_READ: "marked_read",
  MARKED_UNREAD: "marked_unread",
  NOTIFIED: "notified",
  RETRIED: "retried",
  SENT: "sent",
  TESTED: "tested",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const SETTING_KEYS = {
  DEFAULT_CHANNELS: "defaultChannels",
  HOST_DEFAULT_SENDER_ADDRESS_OVERRIDE: "hostDefaultSenderAddressOverride",
  SUPPRESS_OUT_OF_BAND: "suppressOutOfBand",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const SCHEDULED_JOBS = {
  MESSAGE_SWEEPER: "comms:message-sweeper",
} as const;

export type ScheduledJob = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];

export const CHANNEL_TYPE_PRIORITY = {
  EMAIL: 2,
  INAPP: 1,
  SMS: 3,
  WHATSAPP: 4,
} as const;

export type ChannelTypePriority =
  (typeof CHANNEL_TYPE_PRIORITY)[keyof typeof CHANNEL_TYPE_PRIORITY];

export const OUT_OF_BAND_CHANNEL_TYPES = [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
] as const;

export const NOTIFICATION_CHANNEL_TYPE = {
  ...CHANNEL_TYPE,
  INAPP: "inapp",
} as const;

export type NotificationChannelType =
  (typeof NOTIFICATION_CHANNEL_TYPE)[keyof typeof NOTIFICATION_CHANNEL_TYPE];

export const DEFAULT_CHANNEL_TYPES = [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
] as const;

export const PROVIDER_KINDS_BY_CHANNEL_TYPE = {
  [CHANNEL_TYPE.EMAIL]: [
    PROVIDER_KIND.SES,
    PROVIDER_KIND.RESEND,
    PROVIDER_KIND.POSTMARK,
    PROVIDER_KIND.SMTP,
  ],
  [CHANNEL_TYPE.SMS]: [PROVIDER_KIND.TWILIO],
  [CHANNEL_TYPE.WHATSAPP]: [PROVIDER_KIND.WHATSAPP_BUSINESS_API],
} as const;

export const TERMINAL_MESSAGE_STATUSES = ["sent", "delivered", "failed"] as const;
