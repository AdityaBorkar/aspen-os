import type { CommsChannel } from "#/db-schemas/channel";
import type { ProviderCredential } from "#/schemas/channel";

import type { ChannelType, ProviderKind } from "@aspen-os/constants";
import { CHANNEL_TYPE, PROVIDER_KIND } from "@aspen-os/constants";

export interface DeliveryMessage {
  body: string;
  providerTemplateId?: string | null;
  subject?: string | null;
  to: string;
}

export interface SendInput {
  channel: Pick<CommsChannel, "sender_address">;
  credential: ProviderCredential;
  kind: ProviderKind;
  message: DeliveryMessage;
}

export interface TestInput {
  channel: Pick<CommsChannel, "sender_address">;
  credential: ProviderCredential;
  kind: ProviderKind;
  recipientAddress?: string;
}

export interface DeliveryAdapter {
  send: (input: SendInput) => Promise<{ providerMessageId: string }>;
  test?: (input: TestInput) => Promise<void>;
}

/**
 * Strict email-kind inference for legacy tenant channels that carry no
 * provider row. Exactly one credential shape must match; ambiguous or empty
 * credentials throw instead of silently defaulting to SMTP (which has no
 * sender implementation and would fail later at send time).
 */
export function inferEmailKind(credential: ProviderCredential): ProviderKind {
  const matches: ProviderKind[] = [];
  if (credential.accessKeyId && credential.secretAccessKey) {
    matches.push(PROVIDER_KIND.SES);
  }
  if (credential.apiKey) {
    matches.push(PROVIDER_KIND.RESEND);
  }
  if (credential.serverToken) {
    matches.push(PROVIDER_KIND.POSTMARK);
  }
  const [only] = matches;
  if (matches.length === 1 && only) {
    return only;
  }
  if (matches.length > 1) {
    throw new Error(
      `Email credential matches multiple providers (${matches.join(", ")}); store an explicit provider kind instead of inferring.`,
    );
  }
  throw new Error(
    "Email credential matches no known provider shape (expected SES accessKeyId+secretAccessKey, Resend apiKey, or Postmark serverToken).",
  );
}

export function providerKindForChannel(
  type: ChannelType,
  credential: ProviderCredential,
): ProviderKind {
  switch (type) {
    case CHANNEL_TYPE.EMAIL: {
      return inferEmailKind(credential);
    }
    case CHANNEL_TYPE.SMS: {
      return PROVIDER_KIND.TWILIO;
    }
    case CHANNEL_TYPE.WHATSAPP: {
      return PROVIDER_KIND.WHATSAPP_BUSINESS_API;
    }
    default: {
      return PROVIDER_KIND.OTHER;
    }
  }
}

export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function requireCredential(
  credential: ProviderCredential,
  key: string,
  scope?: string,
): string {
  const value = credential[key];
  if (!value) {
    const where = scope ? ` for ${scope}` : "";
    throw new Error(`Provider credential is missing "${key}"${where}.`);
  }
  return value;
}
