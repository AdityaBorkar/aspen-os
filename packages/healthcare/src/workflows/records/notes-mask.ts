import { healthcareClinicalDocument } from "#/db-schemas/records";
import { TimelineQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const NotesMaskInputSchema = object({ input: TimelineQuerySchema });

export const notesMask = Workflow.name("healthcare.records.notes-mask")
  .input(NotesMaskInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TimelineQuerySchema, input);
    const branchId = parsed.branchId ?? "main";
    const docs = await ctx.step.run("load-docs", async () =>
      ctx.db
        .select()
        .from(healthcareClinicalDocument)
        .where(
          and(
            eq(healthcareClinicalDocument.branch_id, branchId),
            eq(healthcareClinicalDocument.patient_id, parsed.patientId),
          ),
        )
        .limit(200),
    );
    const masked = docs.some((row) => {
      const specialty = row.payload?.specialty;
      return (
        row.file_type.toLowerCase().includes("psych") ||
        (is(string(), specialty) && specialty.toLowerCase() === "psych")
      );
    });
    return { masked, patientId: parsed.patientId };
  });
