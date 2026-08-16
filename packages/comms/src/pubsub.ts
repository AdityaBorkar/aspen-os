import type { JsonValue } from "@aspen-os/platform/server";

export const CHANNEL_EVENTS = {
  CREATED: "comms:channel_created",
  CREDENTIAL_ROTATED: "comms:channel_credential_rotated",
  DEFAULT_CHANGED: "comms:channel_default_changed",
  STATUS_CHANGED: "comms:channel_status_changed",
  TESTED: "comms:channel_tested",
  UPDATED: "comms:channel_updated",
} as const;

export const PROVIDER_EVENTS = {
  CREATED: "comms:provider_created",
  STATUS_CHANGED: "comms:provider_status_changed",
} as const;

export const NOTIFICATION_EVENTS = {
  CREATED: "comms:notification_created",
  DISMISSED: "comms:notification_dismissed",
  READ: "comms:notification_read",
} as const;

export const MESSAGE_EVENTS = {
  DELIVERED: "comms:message_delivered",
  FAILED: "comms:message_failed",
  QUEUED: "comms:message_queued",
  SENT: "comms:message_sent",
} as const;

export const PREFERENCE_EVENTS = {
  UPDATED: "comms:preference_updated",
} as const;

export const TEMPLATE_EVENTS = {
  ACTIVATED: "comms:template_activated",
  CREATED: "comms:template_created",
  DEACTIVATED: "comms:template_deactivated",
  UPDATED: "comms:template_updated",
} as const;

export const SETTING_EVENTS = {
  UPDATED: "comms:settings_updated",
} as const;

export const events = {
  CHANNEL_EVENTS,
  MESSAGE_EVENTS,
  NOTIFICATION_EVENTS,
  PREFERENCE_EVENTS,
  PROVIDER_EVENTS,
  SETTING_EVENTS,
  TEMPLATE_EVENTS,
};

export interface ChannelCreatedEvent {
  channel: {
    id: string;
    name: string;
    source: string;
    status: string;
    type: string;
  };
}

export interface ChannelUpdatedEvent {
  changes: Record<string, JsonValue>;
  channelId: string;
}

export interface ChannelStatusChangedEvent {
  channelId: string;
  from: string;
  to: string;
}

export interface ChannelCredentialRotatedEvent {
  channelId: string;
}

export interface ChannelTestedEvent {
  at: string;
  channelId: string;
  ok: boolean;
}

export interface ChannelDefaultChangedEvent {
  channelId: string;
  isDefault: boolean;
  type: string;
}

export interface ProviderCreatedEvent {
  provider: {
    id: string;
    kind: string;
    name: string;
  };
}

export interface ProviderStatusChangedEvent {
  isActive: boolean;
  providerId: string;
}

export interface NotificationCreatedEvent {
  channelTypes: string[];
  notificationId: string;
  recipientId: string;
  recipientType: string;
  type: string;
}

export interface NotificationReadEvent {
  at: string;
  notificationId: string;
  userId: string;
}

export interface NotificationDismissedEvent {
  at: string;
  notificationId: string;
  userId: string;
}

export interface MessageQueuedEvent {
  channelType: string;
  messageId: string;
  to: string;
}

export interface MessageSentEvent {
  messageId: string;
  providerMessageId: string;
}

export interface MessageDeliveredEvent {
  at: string;
  messageId: string;
}

export interface MessageFailedEvent {
  attempts: number;
  error: string;
  messageId: string;
}

export interface PreferenceUpdatedEvent {
  channelType: string;
  enabled: boolean;
  type?: string | null;
  userId: string;
}

export interface TemplateEvent {
  isActive?: boolean;
  name: string;
  templateId: string;
}

export interface SettingsUpdatedEvent {
  changes: Record<string, JsonValue>;
}

export interface ChannelEventMap {
  [CHANNEL_EVENTS.CREDENTIAL_ROTATED]: ChannelCredentialRotatedEvent;
  [CHANNEL_EVENTS.CREATED]: ChannelCreatedEvent;
  [CHANNEL_EVENTS.DEFAULT_CHANGED]: ChannelDefaultChangedEvent;
  [CHANNEL_EVENTS.STATUS_CHANGED]: ChannelStatusChangedEvent;
  [CHANNEL_EVENTS.TESTED]: ChannelTestedEvent;
  [CHANNEL_EVENTS.UPDATED]: ChannelUpdatedEvent;
}

export interface ProviderEventMap {
  [PROVIDER_EVENTS.CREATED]: ProviderCreatedEvent;
  [PROVIDER_EVENTS.STATUS_CHANGED]: ProviderStatusChangedEvent;
}

export interface NotificationEventMap {
  [NOTIFICATION_EVENTS.CREATED]: NotificationCreatedEvent;
  [NOTIFICATION_EVENTS.DISMISSED]: NotificationDismissedEvent;
  [NOTIFICATION_EVENTS.READ]: NotificationReadEvent;
}

export interface MessageEventMap {
  [MESSAGE_EVENTS.DELIVERED]: MessageDeliveredEvent;
  [MESSAGE_EVENTS.FAILED]: MessageFailedEvent;
  [MESSAGE_EVENTS.QUEUED]: MessageQueuedEvent;
  [MESSAGE_EVENTS.SENT]: MessageSentEvent;
}

export interface PreferenceEventMap {
  [PREFERENCE_EVENTS.UPDATED]: PreferenceUpdatedEvent;
}

export interface TemplateEventMap {
  [TEMPLATE_EVENTS.ACTIVATED]: TemplateEvent;
  [TEMPLATE_EVENTS.CREATED]: TemplateEvent;
  [TEMPLATE_EVENTS.DEACTIVATED]: TemplateEvent;
  [TEMPLATE_EVENTS.UPDATED]: TemplateEvent;
}

export interface SettingEventMap {
  [SETTING_EVENTS.UPDATED]: SettingsUpdatedEvent;
}

export type CommsEventMap = ChannelEventMap &
  MessageEventMap &
  NotificationEventMap &
  PreferenceEventMap &
  ProviderEventMap &
  SettingEventMap &
  TemplateEventMap;
