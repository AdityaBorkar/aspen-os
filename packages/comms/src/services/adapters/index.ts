import { createEmailAdapter } from "#/services/adapters/email";
import type { DeliveryAdapter } from "#/services/adapters/shared";
import { createSmsAdapter } from "#/services/adapters/sms";
import { createWhatsAppAdapter } from "#/services/adapters/whatsapp";

import type { ChannelType } from "@aspen-os/constants";
import { CHANNEL_TYPE } from "@aspen-os/constants";

export { createEmailAdapter } from "#/services/adapters/email";
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

/**
 * Single capability table for channel-type routing. Adding a type means
 * adding one row here — not hunting three parallel switches. PUSH/OTHER have
 * no sender implementation and fail fast instead of queuing 5 doomed
 * retries.
 */
const ADAPTER_FACTORIES = {
  [CHANNEL_TYPE.EMAIL]: createEmailAdapter,
  [CHANNEL_TYPE.SMS]: createSmsAdapter,
  [CHANNEL_TYPE.WHATSAPP]: createWhatsAppAdapter,
} as const;

export function createAdapter(type: ChannelType): DeliveryAdapter {
  if (type === CHANNEL_TYPE.PUSH || type === CHANNEL_TYPE.OTHER) {
    throw new Error(
      `Channel type "${type}" has no delivery adapter yet; push/other delivery is not supported.`,
    );
  }
  if (!Object.hasOwn(ADAPTER_FACTORIES, type)) {
    throw new Error(`No delivery adapter for channel type "${type}".`);
  }
  return ADAPTER_FACTORIES[type]();
}
