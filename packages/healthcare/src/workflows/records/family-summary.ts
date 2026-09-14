import { healthcareClinicalDocument, healthcareDischargeSummary } from "#/db-schemas/records";
import { TimelineQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RecordsFamilySummaryInputSchema = object({ input: TimelineQuerySchema });

export const familySummary = Workflow.name("healthcare.records.family-summary")
  .input(RecordsFamilySummaryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TimelineQuerySchema, input);
    const branchId = parsed.branchId ?? "main";
    const [docs, discharges] = await ctx.step.run("load-family", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareClinicalDocument)
          .where(
            and(
              eq(healthcareClinicalDocument.branch_id, branchId),
              eq(healthcareClinicalDocument.patient_id, parsed.patientId),
            ),
          )
          .limit(100),
        ctx.db
          .select()
          .from(healthcareDischargeSummary)
          .where(eq(healthcareDischargeSummary.branch_id, branchId))
          .limit(100),
      ]),
    );
    const psych = docs.some((row) => row.file_type.toLowerCase().includes("psych"));
    return {
      documents: docs.map((row) => ({
        fileType: psych ? "masked" : row.file_type,
        id: row.id,
        label: psych ? "masked" : (row.label ?? null),
        verified: row.verified,
      })),
      encounters: discharges.map((row) => ({
        encounterId: row.encounter_id,
        issuedAt: row.issued_at.toISOString(),
        summary: psych ? "masked" : row.summary,
      })),
      masked: psych,
      patientId: parsed.patientId,
    };
  });
