import { healthcareProblem } from "#/db-schemas/allopathy";
import { ProblemListFiltersSchema } from "#/schemas/allopathy";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ProblemListInputSchema = object({ input: ProblemListFiltersSchema });

export const problemList = Workflow.name("emr.allopathy.problem-list")
  .input(ProblemListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ProblemListFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const limit = parsed.limit ?? 100;
    const offset = parsed.offset ?? 0;
    const rows = await ctx.step.run("list-problems", async () => {
      const clauses = [
        eq(healthcareProblem.branch_id, branchId),
        eq(healthcareProblem.patient_id, parsed.patientId),
      ];
      if (parsed.status) {
        clauses.push(eq(healthcareProblem.status, parsed.status));
      }
      return ctx.db
        .select()
        .from(healthcareProblem)
        .where(and(...clauses))
        .orderBy(desc(healthcareProblem.created_at))
        .limit(limit)
        .offset(offset);
    });
    return rows.map((row) => ({
      branchId: row.branch_id,
      code: row.code,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      label: row.label,
      patientId: row.patient_id,
      status: row.status,
      system: row.system,
    }));
  });
