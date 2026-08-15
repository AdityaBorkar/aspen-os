import { hrSettings } from "#/db-schemas";
import { UpdateHrSettingsSchema } from "#/types";
import { fetchHrSettings } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({
  patch: UpdateHrSettingsSchema,
});

export const updateHrSettings = Workflow.name("hr.setup.update-hr-settings")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { patch } = input;

    const current = await fetchHrSettings(ctx.db);
    const parsed = parse(UpdateHrSettingsSchema, patch);

    if (!current) {
      const [created] = await ctx.db.insert(hrSettings).values(parsed).returning();
      return created;
    }

    const [updated] = await ctx.db
      .update(hrSettings)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrSettings.id, current.id))
      .returning();

    return updated;
  });
