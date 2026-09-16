import { healthcareDrugAdministration, healthcareNursingEscalation } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { TasksFromOrdersSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MissedEscalateInputSchema = object({ input: TasksFromOrdersSchema });

export const missedEscalate = Workflow.name("inpatient.nursing.missed-escalate")
  .input(MissedEscalateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TasksFromOrdersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const missed = await ctx.step.run("load-missed", async () => {
      const filters = [eq(healthcareDrugAdministration.branch_id, branchId)];
      if (parsed.patientId) {
        filters.push(eq(healthcareDrugAdministration.patient_id, parsed.patientId));
      }
      return ctx.db
        .select()
        .from(healthcareDrugAdministration)
        .where(and(...filters))
        .limit(500);
    });
    const due = missed.filter((row) => row.outcome === "missed");
    // oxlint-disable eslint/no-await-in-loop
    for (const row of due) {
      await ctx.step.run(`escalate-${row.id}`, async () =>
        ctx.db.insert(healthcareNursingEscalation).values({
          branch_id: branchId,
          drug_admin_id: row.id,
          patient_id: row.patient_id,
          reason: "Missed dose escalation",
          status: "open",
        }),
      );
    }
    // oxlint-enable eslint/no-await-in-loop
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ESCALATED,
        crudAction: "create",
        entityId: `${due.length}`,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { escalated: due.length },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.ESCALATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: `${due.length}`,
      });
    });
    return { escalated: due.length };
  });
