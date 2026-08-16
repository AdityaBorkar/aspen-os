import { requireCredential } from "#/services/adapters/shared";
import type { DeliveryAdapter, SendInput, TestInput } from "#/services/adapters/shared";

const META_GRAPH_VERSION = "v19.0";

export function createWhatsAppAdapter(): DeliveryAdapter {
  return {
    async send({ credential, message }: SendInput): Promise<{ providerMessageId: string }> {
      const token = requireCredential(credential, "token");
      const phoneNumberId = requireCredential(credential, "phoneNumberId");
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
      // SAFETY: the Meta Graph API returns a JSON object with a "messages" array of
      // Message objects carrying the provider-side "id" field on success.
      const data = (await response.json()) as { messages?: { id?: string }[] };
      const id = data.messages?.[0]?.id;
      return { providerMessageId: id ?? crypto.randomUUID() };
    },
    async test({ credential }: TestInput): Promise<void> {
      const token = requireCredential(credential, "token");
      const phoneNumberId = requireCredential(credential, "phoneNumberId");
      const response = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/request_code`,
        {
          body: JSON.stringify({ code_method: "SMS", locale: "en" }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(
          `Meta WhatsApp number verification failed (${response.status}): ${await response.text()}`,
        );
      }
    },
  };
}
