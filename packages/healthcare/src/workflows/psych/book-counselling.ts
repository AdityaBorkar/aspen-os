import {
  healthcareCaregiverConsent,
  healthcareCounsellingSession,
  healthcareSafetyPlan,
} from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { BookCounsellingSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";
import { fetchLatestRiskStep } from "#/workflow-steps/fetch-risk-flag";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const BookCounsellingInputSchema = object({ input: BookCounsellingSchema });

export const bookCounselling = Workflow.name("healthcare.psych.bookCounselling")
  .input(BookCounsellingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookCounsellingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.status !== "open") {
        throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
      }
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }

    // Moderate/High risk blocks further sessions until safety plan + senior alert exist.
    const risk = await ctx.step.run(fetchLatestRiskStep, {
      branchId,
      patientId: parsed.patientId,
    });
    if (risk && (risk.level === "Moderate" || risk.level === "High")) {
      const cleared = await ctx.step.run("check-risk-clearance", async () => {
        const [plan] = await ctx.db
          .select({ id: healthcareSafetyPlan.id })
          .from(healthcareSafetyPlan)
          .where(
            and(
              eq(healthcareSafetyPlan.patient_id, parsed.patientId),
              eq(healthcareSafetyPlan.branch_id, branchId),
            ),
          )
          .limit(1);
        const { alerts } = risk.payload;
        const alerted = Array.isArray(alerts) && alerts.length > 0;
        return Boolean(plan) && alerted;
      });
      if (!cleared) {
        throw new Error(
          `${risk.level} risk on file: complete a safety plan and alert a senior before further sessions`,
        );
      }
    }

    // Minor gate: patients flagged minor need a signed caregiver consent
    // before counselling starts.
    if (parsed.patientIsMinor) {
      const consented = await ctx.step.run("check-minor-consent", async () => {
        const [consent] = await ctx.db
          .select({ id: healthcareCaregiverConsent.id })
          .from(healthcareCaregiverConsent)
          .where(
            and(
              eq(healthcareCaregiverConsent.patient_id, parsed.patientId),
              eq(healthcareCaregiverConsent.branch_id, branchId),
              eq(healthcareCaregiverConsent.status, "Signed"),
            ),
          )
          .limit(1);
        return Boolean(consent);
      });
      if (!consented) {
        throw new Error("Minor patient needs a signed caregiver consent before counselling starts");
      }
    }

    const [row] = await ctx.step.run("insert-counselling-session", async () =>
      ctx.db
        .insert(healthcareCounsellingSession)
        .values({
          branch_id: branchId,
          created_by: actorId,
          date: parsed.date,
          duration_mins: parsed.durationMins,
          encounter_id: parsed.encounterId ?? null,
          mode: parsed.mode,
          notes: parsed.notes ?? null,
          patient_id: parsed.patientId,
          payload: {
            billingSlab: `${parsed.durationMins}min`,
            consentId: parsed.consentId ?? null,
            link: parsed.link ?? null,
          },
          status: "Booked",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to book the counselling session.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          date: row.date,
          id: row.id,
          mode: row.mode,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      billingSlab: `${parsed.durationMins}min`,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      durationMins: row.duration_mins,
      encounterId: row.encounter_id,
      id: row.id,
      mode: row.mode,
      patientId: row.patient_id,
      status: row.status,
    };
  });
