import { workspaceSetting } from "#/db-schemas";
import { RangePresetSchema } from "#/schemas/enums";
import { TimezoneSchema } from "#/schemas/utils";
import { resolveActorId } from "#/services/access-service";
import { SetSettingSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SETTING_KEYS } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse, safeParse, string } from "valibot";

const SetInputSchema = object({ input: SetSettingSchema });

export function validateSettingValue(key: string, value: JsonValue): JsonValue {
  if (key === SETTING_KEYS.HOME_DASHBOARD) {
    const parsed = safeParse(string(), value);
    if (!parsed.success) {
      throw new Error("home_dashboard must be a dashboard id");
    }
    return parsed.output;
  }
  if (key === SETTING_KEYS.DEFAULT_VIEW || key.startsWith(`${SETTING_KEYS.DEFAULT_VIEW}.`)) {
    const parsed = safeParse(string(), value);
    if (!parsed.success) {
      throw new Error("default_view must be a view id");
    }
    return parsed.output;
  }
  if (key === SETTING_KEYS.DEFAULT_RANGE) {
    const parsed = safeParse(RangePresetSchema, value);
    if (!parsed.success) {
      throw new Error("default_range must be a valid range preset");
    }
    return parsed.output;
  }
  if (key === SETTING_KEYS.TIMEZONE) {
    const parsed = safeParse(TimezoneSchema, value);
    if (!parsed.success) {
      throw new Error("timezone must be a valid IANA timezone");
    }
    return parsed.output;
  }
  throw new Error(`Unknown setting key "${key}"`);
}

export const setSetting = Workflow.name("workspace.settings.set")
  .input(SetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetSettingSchema, input);
    const userId = resolveActorId(ctx.actorId);
    const value = validateSettingValue(parsed.key, parsed.value);

    const existing = await ctx.db
      .select({ id: workspaceSetting.id })
      .from(workspaceSetting)
      .where(and(eq(workspaceSetting.userId, userId), eq(workspaceSetting.key, parsed.key)))
      .limit(1);

    const operation = existing[0]
      ? ctx.db
          .update(workspaceSetting)
          .set({ updatedAt: new Date(), value })
          .where(eq(workspaceSetting.id, existing[0].id))
      : ctx.db.insert(workspaceSetting).values({ key: parsed.key, userId, value });
    await operation;

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.key,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
      newState: { value },
    });

    return { key: parsed.key };
  });
