import { requireCredential, stripHtml } from "#/services/adapters/shared";
import type {
  DeliveryAdapter,
  DeliveryMessage,
  SendInput,
  TestInput,
} from "#/services/adapters/shared";
import type { ProviderCredential } from "#/types";

import { PROVIDER_KIND } from "@aspen-os/constants";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

export function createEmailAdapter(): DeliveryAdapter {
  return {
    async send({
      channel,
      credential,
      kind,
      message,
    }: SendInput): Promise<{ providerMessageId: string }> {
      const from = channel.senderAddress;
      switch (kind) {
        case PROVIDER_KIND.SES: {
          return sendViaSes(credential, from, message);
        }
        case PROVIDER_KIND.RESEND: {
          return sendViaResend(credential, from, message);
        }
        case PROVIDER_KIND.POSTMARK: {
          return sendViaPostmark(credential, from, message);
        }
        default: {
          throw new Error(`Email delivery is not configured for provider kind "${kind}".`);
        }
      }
    },
    async test({ channel, credential, kind, recipientAddress }: TestInput): Promise<void> {
      if (!recipientAddress) {
        throw new Error("recipientAddress is required to verify an email channel.");
      }
      await this.send({
        channel,
        credential,
        kind,
        message: {
          body: "This is a verification message from your communication channel configuration.",
          subject: "Comms channel verification",
          to: recipientAddress,
        },
      });
    },
  };
}

async function sendViaSes(
  credential: ProviderCredential,
  from: string,
  message: DeliveryMessage,
): Promise<{ providerMessageId: string }> {
  const region = requireCredential(credential, "region");
  const accessKeyId = requireCredential(credential, "accessKeyId");
  const secretAccessKey = requireCredential(credential, "secretAccessKey");
  const client = new SESClient({
    credentials: { accessKeyId, secretAccessKey },
    region,
  });
  const result = await client.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [message.to] },
      Message: {
        Body: {
          Html: { Data: message.body },
          Text: { Data: stripHtml(message.body) },
        },
        Subject: { Data: message.subject ?? "" },
      },
      Source: from,
    }),
  );
  return { providerMessageId: result.MessageId ?? crypto.randomUUID() };
}

async function sendViaResend(
  credential: ProviderCredential,
  from: string,
  message: DeliveryMessage,
): Promise<{ providerMessageId: string }> {
  const apiKey = requireCredential(credential, "apiKey");
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: message.body,
      subject: message.subject ?? "",
      text: stripHtml(message.body),
      to: [message.to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status}): ${await response.text()}`);
  }
  // SAFETY: the Resend API returns a JSON object with an "id" field on success.
  const data = (await response.json()) as { id?: string };
  return { providerMessageId: data.id ?? crypto.randomUUID() };
}

async function sendViaPostmark(
  credential: ProviderCredential,
  from: string,
  message: DeliveryMessage,
): Promise<{ providerMessageId: string }> {
  const serverToken = requireCredential(credential, "serverToken");
  const response = await fetch("https://api.postmarkapp.com/email", {
    body: JSON.stringify({
      From: from,
      HtmlBody: message.body,
      Subject: message.subject ?? "",
      TextBody: stripHtml(message.body),
      To: message.to,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Postmark send failed (${response.status}): ${await response.text()}`);
  }
  // SAFETY: the Postmark API returns a JSON object with a "MessageID" field on success.
  const data = (await response.json()) as { MessageID?: string };
  return { providerMessageId: data.MessageID ?? crypto.randomUUID() };
}
