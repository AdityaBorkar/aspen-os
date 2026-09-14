import { healthcareNursingRiskScreen } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordRiskScreenSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RiskScreenInputSchema = object({ input: RecordRiskScreenSchema });

function precautionsFor(kind: string, score: number): string[] {
  const high = kind === "Morse" ? score >= 45 : score <= 12;
  if (high) {
    return ["bed-alarm-on", "hourly-rounding", "keep-belongings-in-reach", "non-slip-footwear"];
  }
  const moderate = kind === "Morse" ? score >= 25 : score <= 14;
  if (moderate) {
    return ["assist-with-ambulation", "night-light-on"];
  }
  return ["routine-observation"];
}

export const riskScreen = Workflow.name("healthcare.nursing.risk-screen")
  .input(RiskScreenInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordRiskScreenSchema, input);
    const branchId = parsed.branchId ?? "main";
    const precautions = precautionsFor(parsed.kind, parsed.score);
    const [row] = await ctx.step.run("insert-screen", async () =>
      ctx.db
        .insert(healthcareNursingRiskScreen)
        .values({
          branch_id: branchId,
          kind: parsed.kind,
          patient_id: parsed.patientId,
          precautions,
          score: String(parsed.score),
          screened_by: parsed.screenedBy,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record risk screen.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { kind: row.kind, patientId: row.patient_id, precautions: row.precautions },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, kind: row.kind, precautions: row.precautions };
  });
