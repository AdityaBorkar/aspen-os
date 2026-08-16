import { commsPreference } from "#/db-schemas";
import { resolveDefaultChannel } from "#/services/channel-resolver";
import type { ChannelScope } from "#/services/channel-resolver";
import type { ResolvedRecipient } from "#/services/recipient-resolver";
import { getSetting } from "#/services/settings-service";
import type { CommsChannel, EnsureDefaultsInput, NotifyInput } from "#/types";
import { SETTING_KEYS, NOTIFICATION_CHANNEL_TYPE } from "#/utils/constants";
import type { NotificationChannelType } from "#/utils/constants";

import type { ChannelType } from "@aspen-os/constants";
import { MASTER_ENTITY_TYPE } from "@aspen-os/constants";
import { getContext } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { boolean, safeParse } from "valibot";

export interface RoutedOutOfBand {
  channelType: ChannelType;
  channel: CommsChannel | null;
}

export interface RoutingResult {
  channelTypes: NotificationChannelType[];
  outOfBand: RoutedOutOfBand[];
}

export interface NotificationRouterDeps {
  db: NodePgDatabase;
  ensureDefaults: {
    run: (input: { input: EnsureDefaultsInput }) => Promise<{ materialized: number }>;
  };
}

const DEFAULT_REQUESTED_CHANNEL_TYPES = [
  NOTIFICATION_CHANNEL_TYPE.INAPP,
  NOTIFICATION_CHANNEL_TYPE.EMAIL,
  NOTIFICATION_CHANNEL_TYPE.SMS,
  NOTIFICATION_CHANNEL_TYPE.WHATSAPP,
] as const;

export async function routeNotification(
  input: NotifyInput,
  resolved: ResolvedRecipient,
  deps: NotificationRouterDeps,
): Promise<RoutingResult> {
  const requested = input.channelTypes ?? [...DEFAULT_REQUESTED_CHANNEL_TYPES];
  const suppressOutOfBand = await readSuppressOutOfBand(deps.db);

  const preferenceRules = await loadPreferenceRules(resolved, input.type, deps.db);
  const scope = tenantScope();

  const outOfBand: RoutedOutOfBand[] = [];
  // oxlint-disable eslint/no-await-in-loop
  for (const channelType of requested) {
    if (channelType === NOTIFICATION_CHANNEL_TYPE.INAPP) {
      continue;
    }
    if (suppressOutOfBand) {
      continue;
    }
    if (!isEnabled(preferenceRules, channelType)) {
      continue;
    }
    const channel = await resolveDefaultChannel(channelType, scope, {
      db: deps.db,
      ensureDefaults: deps.ensureDefaults,
    });
    outOfBand.push({ channel, channelType });
  }

  const channelTypes = requested.filter((channelType) =>
    channelType === NOTIFICATION_CHANNEL_TYPE.INAPP
      ? isEnabled(preferenceRules, channelType)
      : outOfBand.some((decision) => decision.channelType === channelType),
  );

  return { channelTypes, outOfBand };
  // oxlint-enable eslint/no-await-in-loop
}

interface PreferenceRule {
  channelType: string;
  enabled: boolean;
  priority: number;
}

async function loadPreferenceRules(
  resolved: ResolvedRecipient,
  type: string,
  db: NodePgDatabase,
): Promise<Map<string, PreferenceRule>> {
  const rules = new Map<string, PreferenceRule>();
  if (resolved.recipientType !== "user") {
    return rules;
  }

  const rows = await db
    .select()
    .from(commsPreference)
    .where(
      and(
        eq(commsPreference.userId, resolved.recipientId),
        or(eq(commsPreference.type, type), isNull(commsPreference.type)),
      ),
    );

  for (const row of rows) {
    const current = rules.get(row.channelType);
    if (current && !row.type) {
      continue;
    }
    rules.set(row.channelType, {
      channelType: row.channelType,
      enabled: row.enabled,
      priority: row.priority,
    });
  }
  return rules;
}

function isEnabled(
  rules: Map<string, PreferenceRule>,
  channelType: NotificationChannelType,
): boolean {
  const rule = rules.get(channelType);
  return rule ? rule.enabled : true;
}

function tenantScope(): ChannelScope {
  const context = getContext();
  return {
    entityId: context.tenantId ?? "default",
    entityType: MASTER_ENTITY_TYPE.ORGANIZATION,
  };
}

async function readSuppressOutOfBand(db: NodePgDatabase): Promise<boolean> {
  const value = await getSetting(db, SETTING_KEYS.SUPPRESS_OUT_OF_BAND);
  if (value === null) {
    return false;
  }
  const parsed = safeParse(boolean(), value);
  return parsed.success ? parsed.output : false;
}
