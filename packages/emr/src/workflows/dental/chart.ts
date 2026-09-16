import { healthcareDentalChart } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateDentalChartSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ChartInputSchema = object({ input: CreateDentalChartSchema });

export const chart = Workflow.name("emr.dental.chart")
  .input(ChartInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDentalChartSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-dental-chart", async () =>
      ctx.db
        .insert(healthcareDentalChart)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          entries: parsed.entries,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the dental chart.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      entries: row.entries,
      id: row.id,
      patientId: row.patient_id,
    };
  });
