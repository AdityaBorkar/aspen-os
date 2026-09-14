import { healthcareClinicalDocument, healthcareDischargeSummary } from "#/db-schemas/records";
import { TimelineQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { is, object, optional, parse, string } from "valibot";

const DischargePendingInputSchema = object({
  input: object({
    ...TimelineQuerySchema.entries,
    patientId: optional(string()),
    ward: optional(string()),
  }),
});

export const dischargePending = Workflow.name("healthcare.records.discharge-pending")
  .input(DischargePendingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DischargePendingInputSchema, { input }).input;
    const branchId = parsed.branchId ?? "main";

    const [summaries, docs] = await ctx.step.run("load-pending", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareDischargeSummary)
          .where(eq(healthcareDischargeSummary.branch_id, branchId))
          .orderBy(desc(healthcareDischargeSummary.created_at))
          .limit(500),
        ctx.db
          .select()
          .from(healthcareClinicalDocument)
          .where(eq(healthcareClinicalDocument.branch_id, branchId))
          .orderBy(desc(healthcareClinicalDocument.created_at))
          .limit(500),
      ]),
    );

    const issued = new Set(summaries.map((row) => row.encounter_id));
    const pending = docs
      .filter((row) => {
        if (parsed.patientId && row.patient_id !== parsed.patientId) {
          return false;
        }
        if (parsed.ward) {
          const ward = is(string(), row.payload.ward) ? row.payload.ward : null;
          if (ward !== parsed.ward) {
            return false;
          }
        }
        return !issued.has(row.encounter_id ?? "");
      })
      .map((row) => ({
        encounterId: row.encounter_id,
        id: row.id,
        label: row.label,
        patientId: row.patient_id,
        uploadedAt: row.uploaded_at.toISOString(),
        ward: is(string(), row.payload.ward) ? row.payload.ward : null,
      }));

    return {
      issued: summaries.length,
      patientId: parsed.patientId ?? null,
      pending,
      ward: parsed.ward ?? null,
    };
  });
