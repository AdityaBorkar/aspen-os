import { masterSetting } from "#/db-schemas";
import { SetSettingSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  resolveSettingScope,
  settingScopeCondition,
  validateSettingValue,
} from "#/workflows/settings/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const setSetting = Workflow.name("masters.settings.set")
  .input(SetSettingSchema)
  .handler(async ({ key, value }, ctx) => {
    const { userId } = resolveSettingScope(key, ctx.actorId);
    const validated = validateSettingValue(key, value);

    const existing = await ctx.db
      .select({ id: masterSetting.id })
      .from(masterSetting)
      .where(and(eq(masterSetting.key, key), settingScopeCondition(userId)))
      .limit(1);

    const [row] = existing[0]
      ? await ctx.db
          .update(masterSetting)
          .set({ updated_at: new Date(), value: validated })
          .where(eq(masterSetting.id, existing[0].id))
          .returning({ id: masterSetting.id })
      : await ctx.db
          .insert(masterSetting)
          .values({ key, user_id: userId, value: validated })
          .returning({ id: masterSetting.id });

    if (!row) {
      throw new Error(`Failed to set setting "${key}".`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: key,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
      newState: { value: validated },
    });

    return { key };
  });
