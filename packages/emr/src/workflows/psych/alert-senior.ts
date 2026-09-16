import { healthcareRiskFlag } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateSeniorAlertSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";
import { fetchLatestRiskStep } from "#/workflow-steps/fetch-risk-flag";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const AlertSeniorInputSchema = object({ input: CreateSeniorAlertSchema });

export const alertSenior = Workflow.name("emr.psych.alert-senior")
  .input(AlertSeniorInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSeniorAlertSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }

    const risk = await ctx.step.run(fetchLatestRiskStep, {
      branchId,
      patientId: parsed.patientId,
    });

    const nowIso = new Date().toISOString();
    const alert = {
      acknowledged: false,
      actorId,
      at: nowIso,
      reason: parsed.reason,
    } satisfies Record<string, JsonValue>;
    let alertId = `alert-${parsed.patientId}`;
    if (risk) {
      const prior = risk.payload.alerts;
      const alerts = [...(Array.isArray(prior) ? prior : []), alert];
      const [updated] = await ctx.step.run("append-senior-alert", async () =>
        ctx.db
          .update(healthcareRiskFlag)
          .set({ payload: { ...risk.payload, alerts } })
          .where(eq(healthcareRiskFlag.id, risk.id))
          .returning(),
      );
      if (!updated) {
        throw new Error("Failed to record the senior alert.");
      }
      alertId = updated.id;
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ESCALATED,
        crudAction: "create",
        entityId: alertId,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          id: alertId,
          patientId: parsed.patientId,
          reason: parsed.reason,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.UPDATED, {
        actorId,
        at: nowIso,
        branchId,
        data: {
          encounterId: parsed.encounterId ?? null,
          patientId: parsed.patientId,
          reason: parsed.reason,
        },
        id: alertId,
      });
    });

    return {
      acknowledged: false,
      id: alertId,
      patientId: parsed.patientId,
      reason: parsed.reason,
    };
  });
