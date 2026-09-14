import { healthcareIoEntry } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordIoSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const IoChartInputSchema = object({ input: RecordIoSchema });

export const ioChart = Workflow.name("healthcare.nursing.io-chart")
  .input(IoChartInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordIoSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-io", async () =>
      ctx.db
        .insert(healthcareIoEntry)
        .values({
          branch_id: branchId,
          intake_ml: parsed.intakeMl ?? 0,
          note: parsed.note ?? null,
          output_ml: parsed.outputMl ?? 0,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to chart intake/output.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { intakeMl: row.intake_ml, outputMl: row.output_ml, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      balance: row.intake_ml - row.output_ml,
      id: row.id,
      intakeMl: row.intake_ml,
      outputMl: row.output_ml,
      patientId: row.patient_id,
    };
  });
