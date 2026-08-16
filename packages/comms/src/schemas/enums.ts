import { NOTIFICATION_CHANNEL_TYPE } from "#/utils/constants";

import {
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
import { picklist } from "valibot";

export const ChannelTypeSchema = picklist(Object.values(CHANNEL_TYPE));

export const NotificationChannelTypeSchema = picklist(Object.values(NOTIFICATION_CHANNEL_TYPE));

export const ChannelSourceSchema = picklist(Object.values(CHANNEL_SOURCE));

export const ChannelStatusSchema = picklist(Object.values(CHANNEL_STATUS));

export const ProviderKindSchema = picklist(Object.values(PROVIDER_KIND));

export const RecipientTypeSchema = picklist(Object.values(RECIPIENT_TYPE));

export const NotificationStatusSchema = picklist(Object.values(NOTIFICATION_STATUS));

export const NotificationSeveritySchema = picklist(Object.values(NOTIFICATION_SEVERITY));

export const MessageStatusSchema = picklist(Object.values(MESSAGE_STATUS));

export const MasterEntityTypeSchema = picklist(Object.values(MASTER_ENTITY_TYPE));

export {
  CHANNEL_SOURCE,
  CHANNEL_STATUS,
  CHANNEL_TYPE,
  MASTER_ENTITY_TYPE,
  MESSAGE_STATUS,
  NOTIFICATION_CHANNEL_TYPE,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_STATUS,
  PROVIDER_KIND,
  RECIPIENT_TYPE,
};
