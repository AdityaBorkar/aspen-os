import type { CommsChannel, ProviderCredential } from "#/types";

import type { ChannelType, ProviderKind } from "@aspen-os/constants";
import { CHANNEL_TYPE, PROVIDER_KIND } from "@aspen-os/constants";

export interface DeliveryMessage {
  body: string;
  providerTemplateId?: string | null;
  subject?: string | null;
  to: string;
}

export interface SendInput {
  channel: Pick<CommsChannel, "senderAddress">;
  credential: ProviderCredential;
  kind: ProviderKind;
  message: DeliveryMessage;
}

export interface TestInput {
  channel: Pick<CommsChannel, "senderAddress">;
  credential: ProviderCredential;
  kind: ProviderKind;
  recipientAddress?: string;
}

export interface DeliveryAdapter {
  send: (input: SendInput) => Promise<{ providerMessageId: string }>;
  test?: (input: TestInput) => Promise<void>;
}

export function inferEmailKind(credential: ProviderCredential): ProviderKind {
  if (credential.accessKeyId && credential.secretAccessKey) {
    return PROVIDER_KIND.SES;
  }
  if (credential.apiKey) {
    return PROVIDER_KIND.RESEND;
  }
  if (credential.serverToken) {
    return PROVIDER_KIND.POSTMARK;
  }
  return PROVIDER_KIND.SMTP;
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

export function requireCredential(credential: ProviderCredential, key: string): string {
  const value = credential[key];
  if (!value) {
    throw new Error(`Provider credential is missing "${key}".`);
  }
  return value;
}
