import {
  CHANNEL_SOURCE,
  CHANNEL_STATUS,
  CHANNEL_TYPE,
  MESSAGE_STATUS,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_STATUS,
  PROVIDER_KIND,
  RECIPIENT_TYPE,
} from "@aspen-os/constants";
import { pgEnum } from "drizzle-orm/pg-core";

const INAPP_CHANNEL_TYPE = "inapp" as const;

export const commsChannelTypeEnum = pgEnum("channel_type", [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.OTHER,
  CHANNEL_TYPE.PUSH,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
]);

export const commsPreferenceChannelTypeEnum = pgEnum("preference_channel_type", [
  CHANNEL_TYPE.EMAIL,
  INAPP_CHANNEL_TYPE,
  CHANNEL_TYPE.OTHER,
  CHANNEL_TYPE.PUSH,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
]);

export const commsChannelSourceEnum = pgEnum("channel_source", [
  CHANNEL_SOURCE.HOST,
  CHANNEL_SOURCE.TENANT,
]);

export const commsChannelStatusEnum = pgEnum("channel_status", [
  CHANNEL_STATUS.ACTIVE,
  CHANNEL_STATUS.EXPIRED,
  CHANNEL_STATUS.INACTIVE,
  CHANNEL_STATUS.REVOKED,
]);

export const commsProviderKindEnum = pgEnum("provider_kind", [
  PROVIDER_KIND.OTHER,
  PROVIDER_KIND.POSTMARK,
  PROVIDER_KIND.RESEND,
  PROVIDER_KIND.SES,
  PROVIDER_KIND.SMTP,
  PROVIDER_KIND.TWILIO,
  PROVIDER_KIND.WHATSAPP_BUSINESS_API,
]);

export const commsRecipientTypeEnum = pgEnum("recipient_type", [
  RECIPIENT_TYPE.CONTACT,
  RECIPIENT_TYPE.USER,
]);

export const commsNotificationStatusEnum = pgEnum("notification_status", [
  NOTIFICATION_STATUS.DISMISSED,
  NOTIFICATION_STATUS.READ,
  NOTIFICATION_STATUS.UNREAD,
]);

export const commsNotificationSeverityEnum = pgEnum("notification_severity", [
  NOTIFICATION_SEVERITY.IMPORTANT,
  NOTIFICATION_SEVERITY.NORMAL,
  NOTIFICATION_SEVERITY.URGENT,
]);

export const commsMessageStatusEnum = pgEnum("message_status", [
  MESSAGE_STATUS.DELIVERED,
  MESSAGE_STATUS.FAILED,
  MESSAGE_STATUS.QUEUED,
  MESSAGE_STATUS.SENDING,
  MESSAGE_STATUS.SENT,
]);
