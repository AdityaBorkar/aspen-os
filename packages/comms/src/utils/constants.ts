import type { ChannelType, ProviderKind } from "@aspen-os/constants";
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

/** Priority by channel-type value (lower wins). Single source of truth. */
export const CHANNEL_TYPE_PRIORITY = {
  email: 2,
  inapp: 1,
  other: 6,
  push: 5,
  sms: 3,
  whatsapp: 4,
} as const;

export function channelTypePriority(channelType: string): number {
  if (!Object.hasOwn(CHANNEL_TYPE_PRIORITY, channelType)) {
    return 99;
  }
  // SAFETY: hasOwn above proves channelType is a present key of the closed map.
  return CHANNEL_TYPE_PRIORITY[channelType as keyof typeof CHANNEL_TYPE_PRIORITY];
}

/** In-app plus every out-of-band type the router can request. */
export const NOTIFICATION_CHANNEL_TYPE = {
  ...CHANNEL_TYPE,
  INAPP: "inapp",
} as const;

export type NotificationChannelType =
  (typeof NOTIFICATION_CHANNEL_TYPE)[keyof typeof NOTIFICATION_CHANNEL_TYPE];

export const OUT_OF_BAND_CHANNEL_TYPES = [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
] as const;

export const DEFAULT_REQUESTED_CHANNEL_TYPES = [
  NOTIFICATION_CHANNEL_TYPE.INAPP,
  NOTIFICATION_CHANNEL_TYPE.EMAIL,
  NOTIFICATION_CHANNEL_TYPE.SMS,
  NOTIFICATION_CHANNEL_TYPE.WHATSAPP,
] as const;

export const DEFAULT_CHANNEL_TYPES = [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
] as const;

export type DefaultChannelType = (typeof DEFAULT_CHANNEL_TYPES)[number];

/** Which recipient address field each out-of-band type needs. */
export const CHANNEL_ADDRESS_FIELD = {
  [CHANNEL_TYPE.EMAIL]: "email",
  [CHANNEL_TYPE.SMS]: "phone",
  [CHANNEL_TYPE.WHATSAPP]: "phone",
} as const satisfies Partial<Record<ChannelType, "email" | "phone">>;

export type ChannelAddressField = keyof typeof CHANNEL_ADDRESS_FIELD;

export const EMAIL_PROVIDER_KINDS = [
  PROVIDER_KIND.POSTMARK,
  PROVIDER_KIND.RESEND,
  PROVIDER_KIND.SES,
  PROVIDER_KIND.SMTP,
] as const;

export const PROVIDER_KINDS_BY_CHANNEL_TYPE = {
  [CHANNEL_TYPE.EMAIL]: [...EMAIL_PROVIDER_KINDS],
  [CHANNEL_TYPE.SMS]: [PROVIDER_KIND.TWILIO],
  [CHANNEL_TYPE.WHATSAPP]: [PROVIDER_KIND.WHATSAPP_BUSINESS_API],
} as const satisfies Partial<Record<ChannelType, readonly ProviderKind[]>>;

export function providerKindsForChannelType(
  channelType: ChannelType,
): readonly ProviderKind[] | null {
  if (!Object.hasOwn(PROVIDER_KINDS_BY_CHANNEL_TYPE, channelType)) {
    return null;
  }
  // SAFETY: hasOwn above proves channelType is a present key of the closed map.
  return PROVIDER_KINDS_BY_CHANNEL_TYPE[channelType as keyof typeof PROVIDER_KINDS_BY_CHANNEL_TYPE];
}

export const TERMINAL_MESSAGE_STATUSES = ["sent", "delivered", "failed"] as const;

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export function clampListLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIST_LIMIT);
}

export function clampListOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset) || offset < 0) {
    return 0;
  }
  return Math.floor(offset);
}

export const OTP_FALLBACK_SENDER = "no-reply@aspen.local";
export const OTP_SUBJECT = "Your verification code";
export const OTP_BODY_TEMPLATE = "Your verification code is {otp}.";

export const VERIFICATION_EMAIL_SUBJECT = "Comms channel verification";
export const VERIFICATION_MESSAGE_BODY =
  "This is a verification message from your communication channel configuration.";
