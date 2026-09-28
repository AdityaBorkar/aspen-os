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
 * adding one row here — not hunting three parallel switches. PUSH has no
 * channel adapter: it is delivered by `notify()` fan-out to the recipient's
 * browser subscriptions (see services/push.ts). OTHER has no sender at all.
 */
const ADAPTER_FACTORIES = {
  [CHANNEL_TYPE.EMAIL]: createEmailAdapter,
  [CHANNEL_TYPE.SMS]: createSmsAdapter,
  [CHANNEL_TYPE.WHATSAPP]: createWhatsAppAdapter,
} as const;

export function createAdapter(type: ChannelType): DeliveryAdapter {
  if (type === CHANNEL_TYPE.PUSH) {
    throw new Error(
      `Channel type "${type}" has no delivery adapter; push is delivered by notify() fan-out to browser subscriptions.`,
    );
  }
  if (type === CHANNEL_TYPE.OTHER) {
    throw new Error(
      `Channel type "${type}" has no delivery adapter; other delivery is not supported.`,
    );
  }
  if (!Object.hasOwn(ADAPTER_FACTORIES, type)) {
    throw new Error(`No delivery adapter for channel type "${type}".`);
  }
  return ADAPTER_FACTORIES[type]();
}
