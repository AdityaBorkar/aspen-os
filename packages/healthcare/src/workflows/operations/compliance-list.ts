import { healthcareComplianceEvidence } from "#/db-schemas/operations";
import { ComplianceFiltersSchema } from "#/schemas/operations";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ComplianceListInputSchema = object({ input: ComplianceFiltersSchema });

export const complianceList = Workflow.name("healthcare.operations.compliance-list")
  .input(ComplianceListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ComplianceFiltersSchema, input);
    const filters = [eq(healthcareComplianceEvidence.branch_id, parsed.branchId ?? "main")];
    if (parsed.framework) {
      filters.push(eq(healthcareComplianceEvidence.framework, parsed.framework));
    }
    const rows = await ctx.step.run("list-evidence", async () =>
      ctx.db
        .select()
        .from(healthcareComplianceEvidence)
        .where(and(...filters))
        .limit(parsed.limit ?? 100),
    );
    return rows.map((row) => ({
      control: row.control,
      evidencePath: row.evidence_path,
      framework: row.framework,
      id: row.id,
      recordedAt: row.recorded_at.toISOString(),
    }));
  });
