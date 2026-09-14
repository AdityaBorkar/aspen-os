import { healthcareMedicalRegister } from "#/db-schemas/records";
import { RegisterFiltersSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RegistersExportInputSchema = object({ input: RegisterFiltersSchema });

export const registersExport = Workflow.name("healthcare.records.registers-export")
  .input(RegistersExportInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RegisterFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const filters = [eq(healthcareMedicalRegister.branch_id, branchId)];
    if (parsed.register) {
      filters.push(eq(healthcareMedicalRegister.register, parsed.register));
    }
    const rows = await ctx.step.run("load-entries", async () =>
      ctx.db
        .select()
        .from(healthcareMedicalRegister)
        .where(and(...filters))
        .limit(parsed.limit ?? 500),
    );
    return rows.map((row) => ({
      details: row.details,
      enteredAt: row.entered_at.toISOString(),
      id: row.id,
      register: row.register,
      serial: row.serial,
      status: row.status,
    }));
  });
