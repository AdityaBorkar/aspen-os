import { createEmailAdapter } from "#/services/adapters/email";
import { createPushAdapter } from "#/services/adapters/push";
import type { DeliveryAdapter } from "#/services/adapters/shared";
import { createSmsAdapter } from "#/services/adapters/sms";
import { createWhatsAppAdapter } from "#/services/adapters/whatsapp";

import type { ChannelType } from "@aspen-os/constants";
import { CHANNEL_TYPE } from "@aspen-os/constants";

export { createEmailAdapter } from "#/services/adapters/email";
export { createPushAdapter } from "#/services/adapters/push";
export { createSmsAdapter } from "#/services/adapters/sms";
export { createWhatsAppAdapter } from "#/services/adapters/whatsapp";
export {
  inferEmailKind,
  providerKindForChannel,
  requireCredential,
  stripHtml,
} from "#/services/adapters/shared";
export type {
  DeliveryAdapter,
  DeliveryMessage,
  SendInput,
  TestInput,
} from "#/services/adapters/shared";

export function createAdapter(type: ChannelType): DeliveryAdapter {
  switch (type) {
    case CHANNEL_TYPE.EMAIL: {
      return createEmailAdapter();
    }
    case CHANNEL_TYPE.SMS: {
      return createSmsAdapter();
    }
    case CHANNEL_TYPE.WHATSAPP: {
      return createWhatsAppAdapter();
    }
    case CHANNEL_TYPE.PUSH: {
      return createPushAdapter();
    }
    default: {
      throw new Error(`No delivery adapter for channel type "${type}".`);
    }
  }
}
