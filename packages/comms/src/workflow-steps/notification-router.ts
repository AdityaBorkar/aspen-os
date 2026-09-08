import { commsPreference } from "#/db-schemas";
import type { CommsChannel } from "#/db-schemas/channel";
import type { EnsureDefaultsInput } from "#/schemas/channel";
import type { NotifyInput } from "#/schemas/notification";
import { DEFAULT_REQUESTED_CHANNEL_TYPES, SETTING_KEYS } from "#/utils/constants";
import type { NotificationChannelType } from "#/utils/constants";
import { resolveDefaultChannel } from "#/workflow-steps/channel-resolver";
import type { ChannelScope } from "#/workflow-steps/channel-resolver";
import type { ResolvedRecipient } from "#/workflow-steps/recipient-resolver";
import { getSetting } from "#/workflow-steps/settings-service";

import type { ChannelType } from "@aspen-os/constants";
import { MASTER_ENTITY_TYPE } from "@aspen-os/constants";
import { getContext } from "@aspen-os/platform/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
  db: PostgresJsDatabase;
  ensureDefaults: {
    run: (input: { input: EnsureDefaultsInput }) => Promise<{ materialized: number }>;
  };
}

export async function routeNotification(
  input: NotifyInput,
  resolved: ResolvedRecipient,
  deps: NotificationRouterDeps,
): Promise<RoutingResult> {
  const requested = input.channelTypes ?? [...DEFAULT_REQUESTED_CHANNEL_TYPES];
  const suppressOutOfBand = await readSuppressOutOfBand(deps.db);

  const preferenceRules = await loadPreferenceRules(resolved, input.type, deps.db);
  const scope = tenantScope();

  const channelTypesToResolve = requested.filter(
    (channelType): channelType is ChannelType =>
      channelType !== "inapp" && !suppressOutOfBand && isEnabled(preferenceRules, channelType),
  );
  const outOfBand: RoutedOutOfBand[] = await Promise.all(
    channelTypesToResolve.map(async (channelType) => {
      const channel = await resolveDefaultChannel(channelType, scope, {
        db: deps.db,
        ensureDefaults: deps.ensureDefaults,
      });
      return { channel, channelType };
    }),
  );

  const channelTypes = requested.filter((channelType) =>
    channelType === "inapp"
      ? isEnabled(preferenceRules, channelType)
      : outOfBand.some((decision) => decision.channelType === channelType),
  );

  return { channelTypes, outOfBand };
}

interface PreferenceRule {
  channelType: string;
  enabled: boolean;
  priority: number;
}

async function loadPreferenceRules(
  resolved: ResolvedRecipient,
  type: string,
  db: PostgresJsDatabase,
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
        eq(commsPreference.user_id, resolved.recipientId),
        or(eq(commsPreference.type, type), isNull(commsPreference.type)),
      ),
    )
    // Specific (non-null type) rows sort after defaults so they overwrite
    // deterministically; channel ordering keeps the merge stable.
    .orderBy(asc(commsPreference.type), asc(commsPreference.channel_type));

  for (const row of rows) {
    const current = rules.get(row.channel_type);
    if (current && !row.type) {
      continue;
    }
    rules.set(row.channel_type, {
      channelType: row.channel_type,
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

async function readSuppressOutOfBand(db: PostgresJsDatabase): Promise<boolean> {
  const value = await getSetting(db, SETTING_KEYS.SUPPRESS_OUT_OF_BAND);
  if (value === null) {
    return false;
  }
  const parsed = safeParse(boolean(), value);
  return parsed.success ? parsed.output : false;
}
