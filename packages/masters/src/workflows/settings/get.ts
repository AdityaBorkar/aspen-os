import { masterSetting } from "#/db-schemas";
import { GetSettingSchema } from "#/types";
import { resolveSettingScope, settingScopeCondition } from "#/workflows/settings/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const getSetting = Workflow.name("masters.settings.get")
  .input(GetSettingSchema)
  .handler(async ({ key }, ctx) => {
    const { userId } = resolveSettingScope(key, ctx.actorId);

    const [row] = await ctx.db
      .select({ value: masterSetting.value })
      .from(masterSetting)
      .where(and(eq(masterSetting.key, key), settingScopeCondition(userId)))
      .limit(1);

    return row?.value ?? null;
  });
