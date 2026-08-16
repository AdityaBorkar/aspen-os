import { workspaceSetting } from "#/db-schemas";
import { GetSettingSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: GetSettingSchema });

export const getSetting = Workflow.name("workspace.settings.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(GetSettingSchema, input);

    const [row] = await ctx.db
      .select({ value: workspaceSetting.value })
      .from(workspaceSetting)
      .where(and(eq(workspaceSetting.userId, ctx.actorId), eq(workspaceSetting.key, parsed.key)))
      .limit(1);

    return row?.value ?? null;
  });
