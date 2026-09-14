import { healthcareClinicalDocument } from "#/db-schemas/records";
import { CheckRetentionSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RetentionCheckInputSchema = object({ input: CheckRetentionSchema });

const DEFAULT_RETAIN_DAYS = 2555;

export const retentionCheck = Workflow.name("healthcare.records.retention-check")
  .input(RetentionCheckInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CheckRetentionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const filters = [eq(healthcareClinicalDocument.branch_id, branchId)];
    if (parsed.patientId) {
      filters.push(eq(healthcareClinicalDocument.patient_id, parsed.patientId));
    }
    const docs = await ctx.step.run("load-docs", async () =>
      ctx.db
        .select()
        .from(healthcareClinicalDocument)
        .where(and(...filters))
        .limit(1000),
    );
    const blocked: string[] = [];
    let eligible = 0;
    for (const doc of docs) {
      const retainDays = Number(doc.payload?.retainDays ?? DEFAULT_RETAIN_DAYS);
      const expiry = doc.uploaded_at.getTime() + retainDays * 86_400_000;
      if (expiry > Date.now()) {
        blocked.push(doc.id);
      } else {
        eligible += 1;
      }
    }
    return { blocked, eligible, purgeBlocked: blocked.length > 0 };
  });
