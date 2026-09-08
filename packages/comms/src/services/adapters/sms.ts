import { requireCredential } from "#/services/adapters/shared";
import type { DeliveryAdapter, SendInput, TestInput } from "#/services/adapters/shared";
import { VERIFICATION_MESSAGE_BODY } from "#/utils/constants";

import { PROVIDER_KIND } from "@aspen-os/constants";
import { object, safeParse, string } from "valibot";

const TwilioResponseSchema = object({ sid: string() });

export function createSmsAdapter(): DeliveryAdapter {
  async function send({
    channel,
    credential,
    kind,
    message,
  }: SendInput): Promise<{ providerMessageId: string }> {
    if (kind !== PROVIDER_KIND.TWILIO) {
      throw new Error(`SMS delivery requires provider kind "twilio", got "${kind}".`);
    }
    const scope = "Twilio SMS channel";
    const accountSid = requireCredential(credential, "accountSid", scope);
    const authToken = requireCredential(credential, "authToken", scope);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        body: new URLSearchParams({
          Body: message.body,
          From: channel.sender_address,
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
    // SAFETY: Twilio returns JSON; the schema below validates the sid field.
    const data: unknown = await response.json();
    const parsed = safeParse(TwilioResponseSchema, data);
    if (!parsed.success) {
      throw new Error("Twilio send succeeded but returned no sid; refusing to invent one.");
    }
    return { providerMessageId: parsed.output.sid };
  }

  return {
    send,
    async test({ channel, credential, kind, recipientAddress }: TestInput): Promise<void> {
      if (!recipientAddress) {
        throw new Error("recipientAddress is required to verify an SMS channel.");
      }
      await send({
        channel,
        credential,
        kind,
        message: {
          body: VERIFICATION_MESSAGE_BODY,
          to: recipientAddress,
        },
      });
    },
  };
}
