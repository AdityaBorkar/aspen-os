import { healthcareClinicalDocument } from "#/db-schemas/records";
import { CheckRetentionSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RetentionCheckInputSchema = object({ input: CheckRetentionSchema });

// Retention periods per record class in days (Clinical Establishments Act
// baseline: OPD 3 years, IPD 10 years, MLC never purgeable).
function retainDaysFor(klass: string): number {
  switch (klass) {
    case "ipd": {
      return 3650;
    }
    case "mlc": {
      return Number.MAX_SAFE_INTEGER;
    }
    default: {
      return 1095;
    }
  }
}

function recordClassOf(fileType: string): string {
  const lower = fileType.toLowerCase();
  if (lower.includes("mlc")) {
    return "mlc";
  }
  if (lower.includes("ipd") || lower.includes("discharge")) {
    return "ipd";
  }
  return "opd";
}

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
      const klass = recordClassOf(doc.file_type);
      if (parsed.recordClass && klass !== parsed.recordClass) {
        continue;
      }
      const retainDays = Number(doc.payload?.retainDays ?? retainDaysFor(klass));
      const expiry = doc.uploaded_at.getTime() + retainDays * 86_400_000;
      if (expiry > Date.now()) {
        blocked.push(doc.id);
      } else {
        eligible += 1;
      }
    }
    return {
      blocked,
      eligible,
      periods: { ipd: 3650, mlc: "never", opd: 1095 },
      purgeBlocked: blocked.length > 0,
    };
  });
