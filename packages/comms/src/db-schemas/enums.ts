import { NOTIFICATION_CHANNEL_TYPE } from "#/utils/constants";

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

export const commsChannelTypeEnum = pgEnum("comms_channel_type", [
  CHANNEL_TYPE.EMAIL,
  CHANNEL_TYPE.OTHER,
  CHANNEL_TYPE.PUSH,
  CHANNEL_TYPE.SMS,
  CHANNEL_TYPE.WHATSAPP,
]);

export const commsPreferenceChannelTypeEnum = pgEnum("comms_preference_channel_type", [
  NOTIFICATION_CHANNEL_TYPE.EMAIL,
  NOTIFICATION_CHANNEL_TYPE.INAPP,
  NOTIFICATION_CHANNEL_TYPE.OTHER,
  NOTIFICATION_CHANNEL_TYPE.PUSH,
  NOTIFICATION_CHANNEL_TYPE.SMS,
  NOTIFICATION_CHANNEL_TYPE.WHATSAPP,
]);

export const commsChannelSourceEnum = pgEnum("comms_channel_source", [
  CHANNEL_SOURCE.HOST,
  CHANNEL_SOURCE.TENANT,
]);

export const commsChannelStatusEnum = pgEnum("comms_channel_status", [
  CHANNEL_STATUS.ACTIVE,
  CHANNEL_STATUS.EXPIRED,
  CHANNEL_STATUS.INACTIVE,
  CHANNEL_STATUS.REVOKED,
]);

export const commsProviderKindEnum = pgEnum("comms_provider_kind", [
  PROVIDER_KIND.OTHER,
  PROVIDER_KIND.POSTMARK,
  PROVIDER_KIND.RESEND,
  PROVIDER_KIND.SES,
  PROVIDER_KIND.SMTP,
  PROVIDER_KIND.TWILIO,
  PROVIDER_KIND.WHATSAPP_BUSINESS_API,
]);

export const commsRecipientTypeEnum = pgEnum("comms_recipient_type", [
  RECIPIENT_TYPE.CONTACT,
  RECIPIENT_TYPE.USER,
]);

export const commsNotificationStatusEnum = pgEnum("comms_notification_status", [
  NOTIFICATION_STATUS.DISMISSED,
  NOTIFICATION_STATUS.READ,
  NOTIFICATION_STATUS.UNREAD,
]);

export const commsNotificationSeverityEnum = pgEnum("comms_notification_severity", [
  NOTIFICATION_SEVERITY.IMPORTANT,
  NOTIFICATION_SEVERITY.NORMAL,
  NOTIFICATION_SEVERITY.URGENT,
]);

export const commsMessageStatusEnum = pgEnum("comms_message_status", [
  MESSAGE_STATUS.DELIVERED,
  MESSAGE_STATUS.FAILED,
  MESSAGE_STATUS.QUEUED,
  MESSAGE_STATUS.SENDING,
  MESSAGE_STATUS.SENT,
]);
