import { PharmacyIdSchema } from "#/schemas/pharmacy";
import { fetchPharmacySaleStep } from "#/workflow-steps/fetch-pharmacy";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PharmacyIdInputSchema = object({ input: PharmacyIdSchema });

export const getSale = Workflow.name("pharmacy.get-sale")
  .input(PharmacyIdInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PharmacyIdSchema, input);
    const branchId = parsed.branchId ?? "main";

    const sale = await ctx.step.run(fetchPharmacySaleStep, { id: parsed.id });
    if (sale.branch_id !== branchId) {
      throw new Error("Sale belongs to a different branch; verify the sale and retry.");
    }
    const payload: Record<string, JsonValue> = sale.payload;
    return {
      branchId: sale.branch_id,
      createdAt: sale.created_at.toISOString(),
      id: sale.id,
      mode: sale.mode,
      patientId: sale.patient_id,
      payload,
      prescriptionId: sale.prescription_id,
      saleNo: sale.sale_no,
      status: sale.status,
      total: Number(sale.total),
      updatedAt: sale.updated_at.toISOString(),
    };
  });
