import { healthcareLabJob } from "#/db-schemas/dental";
import { PendingJobsFiltersSchema } from "#/schemas/dental";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const PendingJobsInputSchema = object({ input: PendingJobsFiltersSchema });

export const pendingJobs = Workflow.name("emr.dental.pendingJobs")
  .input(PendingJobsInputSchema)
  .handler(async ({ input }, ctx) => {
    // Dental lab jobs are a clinical read view; fulfilment lives in
    // tasks.task via the tasks.healthcare-bridge. This view keeps clinical
    // staging/overdue display without owning status/automation.
    const parsed = parse(PendingJobsFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const clauses = [
      eq(healthcareLabJob.branch_id, branchId),
      inArray(healthcareLabJob.status, ["Raised", "InLab", "Trial", "Remake"]),
    ];
    if (parsed.patientId) {
      clauses.push(eq(healthcareLabJob.patient_id, parsed.patientId));
    }
    if (parsed.planId) {
      clauses.push(eq(healthcareLabJob.plan_id, parsed.planId));
    }
    if (parsed.status) {
      clauses.push(eq(healthcareLabJob.status, parsed.status));
    }
    const jobs = await ctx.step.run("list-pending-jobs", async () =>
      ctx.db
        .select()
        .from(healthcareLabJob)
        .where(and(...clauses))
        .orderBy(desc(healthcareLabJob.created_at)),
    );
    const now = Date.now();
    return jobs.map((row) => {
      const spec: Record<string, JsonValue> = row.payload;
      const dueDate = is(string(), spec.dueDate) ? spec.dueDate : null;
      const overdue = dueDate ? new Date(dueDate).getTime() < now : false;
      return {
        branchId: row.branch_id,
        createdAt: row.created_at.toISOString(),
        dueDate,
        encounterId: row.encounter_id,
        id: row.id,
        kind: row.kind,
        labName: row.lab_name,
        metal: is(string(), spec.metal) ? spec.metal : null,
        overdue,
        patientId: row.patient_id,
        planId: row.plan_id,
        qcNote: is(string(), spec.qcNote) ? spec.qcNote : null,
        shade: is(string(), spec.shade) ? spec.shade : null,
        status: row.status,
        tooth: row.tooth,
      };
    });
  });
