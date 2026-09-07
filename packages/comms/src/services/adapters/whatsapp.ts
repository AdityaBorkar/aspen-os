import { requireCredential } from "#/services/adapters/shared";
import type { DeliveryAdapter, SendInput, TestInput } from "#/services/adapters/shared";
import { VERIFICATION_MESSAGE_BODY } from "#/utils/constants";

import { PROVIDER_KIND } from "@aspen-os/constants";
import { array, object, optional, safeParse, string } from "valibot";

const META_GRAPH_VERSION = "v19.0";

const WhatsAppResponseSchema = object({
  messages: optional(array(object({ id: optional(string()) }))),
});

export function createWhatsAppAdapter(): DeliveryAdapter {
  async function send({ credential, kind, message }: SendInput): Promise<{
    providerMessageId: string;
  }> {
    if (kind !== PROVIDER_KIND.WHATSAPP_BUSINESS_API) {
      throw new Error(
        `WhatsApp delivery requires provider kind "whatsapp_business_api", got "${kind}".`,
      );
    }
    const scope = "WhatsApp channel";
    const token = requireCredential(credential, "token", scope);
    const phoneNumberId = requireCredential(credential, "phoneNumberId", scope);
    if (!message.providerTemplateId) {
      throw new Error(
        "WhatsApp delivery requires a template with providerTemplateId (Meta pre-approved templates).",
      );
    }
    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          template: {
            language: { code: "en" },
            name: message.providerTemplateId,
          },
          to: message.to,
          type: "template",
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    if (!response.ok) {
      throw new Error(`Meta WhatsApp send failed (${response.status}): ${await response.text()}`);
    }
    // SAFETY: Meta returns JSON; the schema below validates the messages[0].id field.
    const data: unknown = await response.json();
    const parsed = safeParse(WhatsAppResponseSchema, data);
    const id = parsed.success ? parsed.output.messages?.[0]?.id : undefined;
    if (!id) {
      throw new Error("Meta send succeeded but returned no message id; refusing to invent one.");
    }
    return { providerMessageId: id };
  }

  return {
    send,
    async test({ channel, credential, kind, recipientAddress }: TestInput): Promise<void> {
      if (!recipientAddress) {
        throw new Error("recipientAddress is required to verify a WhatsApp channel.");
      }
      const templateId = "verification";
      await send({
        channel,
        credential,
        kind,
        message: {
          body: VERIFICATION_MESSAGE_BODY,
          providerTemplateId: templateId,
          to: recipientAddress,
        },
      });
    },
  };
}
