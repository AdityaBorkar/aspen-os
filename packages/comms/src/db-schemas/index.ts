import { commsChannel } from "#/db-schemas/channel";
import {
  commsChannelSourceEnum,
  commsChannelStatusEnum,
  commsChannelTypeEnum,
  commsMessageStatusEnum,
  commsNotificationSeverityEnum,
  commsNotificationStatusEnum,
  commsPreferenceChannelTypeEnum,
  commsProviderKindEnum,
  commsRecipientTypeEnum,
} from "#/db-schemas/enums";
import { commsMessage } from "#/db-schemas/message";
import { commsNotification } from "#/db-schemas/notification";
import { commsPreference } from "#/db-schemas/preference";
import { commsProvider } from "#/db-schemas/provider";
import { commsSetting } from "#/db-schemas/setting";
import { commsTemplate } from "#/db-schemas/template";

export { commsChannel } from "#/db-schemas/channel";
export {
  commsChannelSourceEnum,
  commsChannelStatusEnum,
  commsChannelTypeEnum,
  commsMessageStatusEnum,
  commsNotificationSeverityEnum,
  commsNotificationStatusEnum,
  commsPreferenceChannelTypeEnum,
  commsProviderKindEnum,
  commsRecipientTypeEnum,
} from "#/db-schemas/enums";
export { commsMessage } from "#/db-schemas/message";
export { commsNotification } from "#/db-schemas/notification";
export { commsPreference } from "#/db-schemas/preference";
export { commsProvider } from "#/db-schemas/provider";
export { commsSetting } from "#/db-schemas/setting";
export { commsTemplate } from "#/db-schemas/template";

export const commsTables = {
  commsChannel,
  commsMessage,
  commsNotification,
  commsPreference,
  commsSetting,
  commsTemplate,
} as const;

/**
 * Provider rows are host-global (control plane). Everything else is
 * per-tenant. Do not query commsProvider on a tenant `ctx.db` — use the
 * control-plane handle (see findFirstActiveProvider / ensure-defaults).
 *
 * drizzle-kit's push only creates enum types listed as top-level values of
 * the schema map, so every enum used by the co-located tables is included.
 */
export const control_plane_schemas = {
  commsProvider,
  commsProviderKindEnum,
} as const;

export const tenant_schemas = {
  commsChannel,
  commsChannelSourceEnum,
  commsChannelStatusEnum,
  commsChannelTypeEnum,
  commsMessage,
  commsMessageStatusEnum,
  commsNotification,
  commsNotificationSeverityEnum,
  commsNotificationStatusEnum,
  commsPreference,
  commsPreferenceChannelTypeEnum,
  commsRecipientTypeEnum,
  commsSetting,
  commsTemplate,
} as const;
