import { commsChannel } from "#/db-schemas/channel";
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

export const control_plane_schemas = {
  commsProvider,
} as const;

export const tenant_schemas = commsTables;
