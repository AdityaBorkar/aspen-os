import { requireCredential } from "#/services/adapters/shared";
import type { DeliveryAdapter, SendInput, TestInput } from "#/services/adapters/shared";

import { PROVIDER_KIND } from "@aspen-os/constants";

export function createSmsAdapter(): DeliveryAdapter {
  return {
    async send({
      channel,
      credential,
      message,
    }: SendInput): Promise<{ providerMessageId: string }> {
      const accountSid = requireCredential(credential, "accountSid");
      const authToken = requireCredential(credential, "authToken");
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          body: new URLSearchParams({
            Body: message.body,
            From: channel.senderAddress,
            To: message.to,
          }),
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(`Twilio send failed (${response.status}): ${await response.text()}`);
      }
      // SAFETY: the Twilio Messages API returns a JSON object with a "sid" field on success.
      const data = (await response.json()) as { sid?: string };
      return { providerMessageId: data.sid ?? crypto.randomUUID() };
    },
    async test({ channel, credential, recipientAddress }: TestInput): Promise<void> {
      if (!recipientAddress) {
        throw new Error("recipientAddress is required to verify an SMS channel.");
      }
      await this.send({
        channel,
        credential,
        kind: PROVIDER_KIND.TWILIO,
        message: {
          body: "This is a verification message from your communication channel configuration.",
          to: recipientAddress,
        },
      });
    },
  };
}
