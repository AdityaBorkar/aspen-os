import type { ProviderCredential } from "#/schemas/channel";
import { requireCredential, stripHtml } from "#/services/adapters/shared";
import type {
  DeliveryAdapter,
  DeliveryMessage,
  SendInput,
  TestInput,
} from "#/services/adapters/shared";
import { VERIFICATION_EMAIL_SUBJECT, VERIFICATION_MESSAGE_BODY } from "#/utils/constants";

import { PROVIDER_KIND } from "@aspen-os/constants";
import type { ProviderKind } from "@aspen-os/constants";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { object, optional, safeParse, string } from "valibot";

const ResendResponseSchema = object({ id: string() });
const PostmarkResponseSchema = object({ MessageID: string() });
const SesResponseSchema = object({ MessageId: optional(string()) });

const EMAIL_KINDS: ReadonlySet<ProviderKind> = new Set([
  PROVIDER_KIND.POSTMARK,
  PROVIDER_KIND.RESEND,
  PROVIDER_KIND.SES,
  PROVIDER_KIND.SMTP,
]);

function assertEmailKind(kind: ProviderKind): void {
  if (!EMAIL_KINDS.has(kind)) {
    throw new Error(`Email delivery does not support provider kind "${kind}".`);
  }
  if (kind === PROVIDER_KIND.SMTP) {
    throw new Error("SMTP email delivery is not configured; use SES, Resend, or Postmark.");
  }
}

export function createEmailAdapter(): DeliveryAdapter {
  async function send({
    channel,
    credential,
    kind,
    message,
  }: SendInput): Promise<{ providerMessageId: string }> {
    assertEmailKind(kind);
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
  }

  return {
    send,
    async test({ channel, credential, kind, recipientAddress }: TestInput): Promise<void> {
      if (!recipientAddress) {
        throw new Error("recipientAddress is required to verify an email channel.");
      }
      await send({
        channel,
        credential,
        kind,
        message: {
          body: VERIFICATION_MESSAGE_BODY,
          subject: VERIFICATION_EMAIL_SUBJECT,
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
  const scope = "SES email channel";
  const region = requireCredential(credential, "region", scope);
  const accessKeyId = requireCredential(credential, "accessKeyId", scope);
  const secretAccessKey = requireCredential(credential, "secretAccessKey", scope);
  const client = new SESClient({
    credentials: { accessKeyId, secretAccessKey },
    region,
  });
  const text = stripHtml(message.body);
  const result = await client.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [message.to] },
      Message: {
        Body: {
          Html: { Data: message.body },
          Text: { Data: text },
        },
        Subject: { Data: message.subject ?? "" },
      },
      Source: from,
    }),
  );
  const parsed = safeParse(SesResponseSchema, result);
  if (!parsed.success || !parsed.output.MessageId) {
    throw new Error("SES send succeeded but returned no MessageId; refusing to invent one.");
  }
  return { providerMessageId: parsed.output.MessageId };
}

async function sendViaResend(
  credential: ProviderCredential,
  from: string,
  message: DeliveryMessage,
): Promise<{ providerMessageId: string }> {
  const apiKey = requireCredential(credential, "apiKey", "Resend email channel");
  const text = stripHtml(message.body);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: message.body,
      subject: message.subject ?? "",
      text,
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
  // SAFETY: Resend returns JSON; the schema below validates the id field.
  const data: unknown = await response.json();
  const parsed = safeParse(ResendResponseSchema, data);
  if (!parsed.success) {
    throw new Error("Resend send succeeded but returned no id; refusing to invent one.");
  }
  return { providerMessageId: parsed.output.id };
}

async function sendViaPostmark(
  credential: ProviderCredential,
  from: string,
  message: DeliveryMessage,
): Promise<{ providerMessageId: string }> {
  const serverToken = requireCredential(credential, "serverToken", "Postmark email channel");
  const text = stripHtml(message.body);
  const response = await fetch("https://api.postmarkapp.com/email", {
    body: JSON.stringify({
      From: from,
      HtmlBody: message.body,
      Subject: message.subject ?? "",
      TextBody: text,
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
  // SAFETY: Postmark returns JSON; the schema below validates the MessageID field.
  const data: unknown = await response.json();
  const parsed = safeParse(PostmarkResponseSchema, data);
  if (!parsed.success) {
    throw new Error("Postmark send succeeded but returned no MessageID; refusing to invent one.");
  }
  return { providerMessageId: parsed.output.MessageID };
}
