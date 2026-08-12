import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { payrollSettings } from "../db-schemas";
import { UpdatePayrollSettingsSchema } from "../types";
import { fetchPayrollSettings } from "./utils";

const InputSchema = object({
  patch: UpdatePayrollSettingsSchema,
});

export const updatePayrollSettings = Workflow.name(
  "hr.setup.update-payroll-settings",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { patch } = input;

    const current = await fetchPayrollSettings(ctx.db);
    const parsed = parse(UpdatePayrollSettingsSchema, patch);

    if (!current) {
      const [created] = await ctx.db
        .insert(payrollSettings)
        .values(parsed)
        .returning();
      return created;
    }

    const [updated] = await ctx.db
      .update(payrollSettings)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(payrollSettings.id, current.id))
      .returning();

    return updated;
  });
