import { healthcareRehabSitting } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { BookRehabSittingSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BookSittingInputSchema = object({ input: BookRehabSittingSchema });

export const bookSitting = Workflow.name("healthcare.rehab.bookSitting")
  .input(BookSittingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookRehabSittingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const episode = await ctx.step.run(fetchRehabEpisodeStep, {
      id: parsed.episodeId,
    });
    if (episode.status !== "Active") {
      throw new Error("Rehab episode is discharged; open a new episode for further care");
    }
    if (episode.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the rehab episode; check the selected patient");
    }

    const [row] = await ctx.step.run("insert-rehab-sitting", async () =>
      ctx.db
        .insert(healthcareRehabSitting)
        .values({
          branch_id: branchId,
          created_by: actorId,
          date: parsed.date,
          episode_id: parsed.episodeId,
          package_id: parsed.packageId ?? null,
          patient_id: parsed.patientId,
          slot: parsed.slot ?? null,
          status: "Booked",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to book the rehab sitting.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          date: row.date,
          episodeId: row.episode_id,
          id: row.id,
          patientId: row.patient_id,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      episodeId: row.episode_id,
      id: row.id,
      packageId: row.package_id,
      patientId: row.patient_id,
      slot: row.slot,
      status: row.status,
    };
  });
