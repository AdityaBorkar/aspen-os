import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { payrollSettings } from "../db-schemas";

const InputSchema = object({});

export const getPayrollSettings = Workflow.name("hr.setup.get-payroll-settings")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    const [settings] = await ctx.db.select().from(payrollSettings).limit(1);
    return settings ?? null;
  });
