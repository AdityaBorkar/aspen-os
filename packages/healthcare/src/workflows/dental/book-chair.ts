import { healthcareChairSlot, healthcareDentalConsent } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateChairSlotSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const BookChairInputSchema = object({ input: CreateChairSlotSchema });

export const bookChair = Workflow.name("healthcare.dental.bookChair")
  .input(BookChairInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateChairSlotSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const encounter = await ctx.step.run(fetchEncounterStep, {
      id: parsed.encounterId,
    });
    if (encounter.status !== "open") {
      throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
    }
    if (encounter.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the parent encounter; check the selected patient");
    }

    const signed = await ctx.step.run("check-signed-consent", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareDentalConsent.id })
        .from(healthcareDentalConsent)
        .where(
          and(
            eq(healthcareDentalConsent.encounter_id, parsed.encounterId),
            eq(healthcareDentalConsent.patient_id, parsed.patientId),
            eq(healthcareDentalConsent.status, "Signed"),
          ),
        )
        .limit(1);
      return row;
    });
    if (!signed) {
      throw new Error(
        "Consent must be signed before the first sitting; complete the consent form first",
      );
    }

    const clash = await ctx.step.run("check-chair-overlap", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareChairSlot.id })
        .from(healthcareChairSlot)
        .where(
          and(
            eq(healthcareChairSlot.branch_id, branchId),
            eq(healthcareChairSlot.chair_id, parsed.chairId),
            eq(healthcareChairSlot.date, parsed.date),
            eq(healthcareChairSlot.slot, parsed.slot),
          ),
        )
        .limit(1);
      return row;
    });
    if (clash) {
      throw new Error("Chair slot is already booked; pick another chair, date, or slot");
    }

    const [row] = await ctx.step.run("insert-chair-slot", async () =>
      ctx.db
        .insert(healthcareChairSlot)
        .values({
          branch_id: branchId,
          chair_id: parsed.chairId,
          created_by: actorId,
          date: parsed.date,
          encounter_id: parsed.encounterId,
          patient_id: parsed.patientId,
          slot: parsed.slot,
          status: "Booked",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to book the chair slot.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          chairId: row.chair_id,
          date: row.date,
          id: row.id,
          patientId: row.patient_id,
          slot: row.slot,
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
      chairId: row.chair_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      encounterId: row.encounter_id,
      id: row.id,
      patientId: row.patient_id,
      slot: row.slot,
      status: row.status,
    };
  });
