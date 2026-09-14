import {
  healthcareClinicalDocument,
  healthcareDischargeSummary,
  healthcareMedicalAddendum,
} from "#/db-schemas/records";
import { EncounterGetSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const EncounterGetInputSchema = object({ input: EncounterGetSchema });

export const encounterGet = Workflow.name("healthcare.records.encounter-get")
  .input(EncounterGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EncounterGetSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [addenda, discharges, docs] = await ctx.step.run("load-encounter", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareMedicalAddendum)
          .where(
            and(
              eq(healthcareMedicalAddendum.branch_id, branchId),
              eq(healthcareMedicalAddendum.encounter_id, parsed.encounterId),
            ),
          )
          .limit(100),
        ctx.db
          .select()
          .from(healthcareDischargeSummary)
          .where(
            and(
              eq(healthcareDischargeSummary.branch_id, branchId),
              eq(healthcareDischargeSummary.encounter_id, parsed.encounterId),
            ),
          )
          .limit(10),
        ctx.db
          .select()
          .from(healthcareClinicalDocument)
          .where(
            and(
              eq(healthcareClinicalDocument.branch_id, branchId),
              eq(healthcareClinicalDocument.encounter_id, parsed.encounterId),
            ),
          )
          .limit(100),
      ]),
    );
    if (addenda.length === 0 && discharges.length === 0 && docs.length === 0) {
      throw new Error("Encounter not found; verify the encounter id and retry");
    }
    return {
      addenda: addenda.map((row) => ({
        authorId: row.author_id,
        createdAt: row.created_at.toISOString(),
        id: row.id,
        note: row.note,
      })),
      discharges: discharges.map((row) => ({
        id: row.id,
        issuedAt: row.issued_at.toISOString(),
        summary: row.summary,
      })),
      documents: docs.map((row) => ({
        fileType: row.file_type,
        id: row.id,
        label: row.label,
        verified: row.verified,
      })),
      encounterId: parsed.encounterId,
    };
  });
