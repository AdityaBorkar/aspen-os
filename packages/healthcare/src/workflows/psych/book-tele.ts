import { healthcareCounsellingSession } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { BookCounsellingSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";
import { fetchLatestRiskStep } from "#/workflow-steps/fetch-risk-flag";
import {
  assertMinorConsent,
  assertRiskCleared,
  assertTeleConsent,
} from "#/workflows/shared/psych-booking";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BookTeleInputSchema = object({ input: BookCounsellingSchema });

export const bookTele = Workflow.name("healthcare.psych.bookTele")
  .input(BookTeleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookCounsellingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }

    // Tele sessions need a signed tele/general/counselling consent on file.
    await ctx.step.run("check-tele-consent", async () => {
      await assertTeleConsent(ctx.db, { branchId, patientId: parsed.patientId });
    });

    // Moderate/High risk blocks further sessions until safety plan + senior alert exist.
    const risk = await ctx.step.run(fetchLatestRiskStep, {
      branchId,
      patientId: parsed.patientId,
    });
    await ctx.step.run("check-risk-clearance", async () => {
      await assertRiskCleared(ctx.db, { branchId, patientId: parsed.patientId }, risk);
    });

    // Tele sessions need a recorded consent before the link is issued, and
    // minors need a signed caregiver consent first.
    if (!parsed.consentId) {
      throw new Error("Tele-psychiatry needs a recorded consent before the link is issued");
    }
    if (parsed.patientIsMinor) {
      await ctx.step.run("check-minor-consent", async () => {
        await assertMinorConsent(
          ctx.db,
          { branchId, patientId: parsed.patientId },
          "Minor patient needs a signed caregiver consent before tele-psychiatry starts",
        );
      });
    }

    const [row] = await ctx.step.run("insert-tele-session", async () =>
      ctx.db
        .insert(healthcareCounsellingSession)
        .values({
          branch_id: branchId,
          created_by: actorId,
          date: parsed.date,
          duration_mins: parsed.durationMins,
          encounter_id: parsed.encounterId ?? null,
          mode: "tele",
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
      throw new Error("Failed to book the tele session.");
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
