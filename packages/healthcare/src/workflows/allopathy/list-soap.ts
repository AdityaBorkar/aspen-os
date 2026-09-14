import { healthcareSoapNote } from "#/db-schemas/allopathy";
import { SoapNoteFiltersSchema } from "#/schemas/allopathy";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListSoapInputSchema = object({ input: SoapNoteFiltersSchema });

export const listSoap = Workflow.name("healthcare.allopathy.listSoap")
  .input(ListSoapInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SoapNoteFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("list-soap-notes", async () => {
      const conditions = [eq(healthcareSoapNote.branch_id, branchId)];
      if (parsed.encounterId) {
        conditions.push(eq(healthcareSoapNote.encounter_id, parsed.encounterId));
      }
      if (parsed.patientId) {
        conditions.push(eq(healthcareSoapNote.patient_id, parsed.patientId));
      }
      return ctx.db
        .select()
        .from(healthcareSoapNote)
        .where(and(...conditions))
        .orderBy(desc(healthcareSoapNote.created_at))
        .limit(parsed.limit ?? 50)
        .offset(parsed.offset ?? 0);
    });

    return rows.map((row) => ({
      assessment: row.assessment,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      diagnoses: row.diagnoses,
      encounterId: row.encounter_id,
      id: row.id,
      objective: row.objective,
      patientId: row.patient_id,
      plan: row.plan,
      subjective: row.subjective,
    }));
  });
