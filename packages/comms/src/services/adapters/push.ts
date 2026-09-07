import type { DeliveryAdapter } from "#/services/adapters/shared";

export function createPushAdapter(): DeliveryAdapter {
  return {
    async send(): Promise<{ providerMessageId: string }> {
      throw new Error("Push delivery is not supported yet.");
    },
    async test(): Promise<void> {
      throw new Error("Push delivery is not supported yet.");
    },
  };
}
