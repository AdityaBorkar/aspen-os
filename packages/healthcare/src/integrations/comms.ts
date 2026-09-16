import type { JsonValue } from "@aspen-os/platform/server";

export const HEALTHCARE_OPT_OUT_MESSAGE =
  "Recipient has opted out; messaging is blocked for this recipient";

export const HEALTHCARE_OUTBOUND_CHANNELS = ["print", "sms", "whatsapp"] as const;

export type HealthcareOutboundChannel = (typeof HEALTHCARE_OUTBOUND_CHANNELS)[number];

export type CommsChannelType = "email" | "inapp" | "other" | "push" | "sms" | "whatsapp";

const HEALTHCARE_TO_COMMS_CHANNEL = {
  print: "other",
  sms: "sms",
  whatsapp: "whatsapp",
} as const satisfies Record<HealthcareOutboundChannel, CommsChannelType>;

export function mapHealthcareChannelToComms(channel: HealthcareOutboundChannel): CommsChannelType {
  return HEALTHCARE_TO_COMMS_CHANNEL[channel];
}

export function mapHealthcareChannelToPreference(channel: HealthcareOutboundChannel): string {
  if (channel === "print") {
    return "other";
  }
  return channel;
}

export interface HealthcareMessageIntent {
  branchId: string;
  channel: HealthcareOutboundChannel;
  encounterId?: string;
  healthcareMessageId: string;
  patientId?: string | null;
  template?: string;
  to: string;
}

export interface HealthcareOptOutIntent {
  branchId: string;
  channel: HealthcareOutboundChannel;
  healthcareOptOutId: string;
  to: string;
}

export interface CommsMessageQueuedIntent {
  [key: string]: JsonValue;
  channelType: CommsChannelType;
  messageId: string;
  to: string;
}

export interface CommsPreferenceUpdatedIntent {
  [key: string]: JsonValue;
  channelType: string;
  enabled: boolean;
  userId: string;
}

export function buildCommsMessageQueuedEvent(
  intent: HealthcareMessageIntent,
): CommsMessageQueuedIntent {
  return {
    channelType: mapHealthcareChannelToComms(intent.channel),
    messageId: intent.healthcareMessageId,
    to: intent.to,
  };
}

export function buildCommsPreferenceUpdatedEvent(
  intent: HealthcareOptOutIntent,
): CommsPreferenceUpdatedIntent {
  return {
    channelType: mapHealthcareChannelToPreference(intent.channel),
    enabled: false,
    userId: intent.to,
  };
}
