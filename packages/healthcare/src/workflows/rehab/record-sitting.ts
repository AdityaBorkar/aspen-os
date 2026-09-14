import { healthcareRehabEpisode, healthcareRehabSitting } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { RecordRehabSittingSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, optional, parse } from "valibot";

const RecordSittingInputSchema = object({ input: RecordRehabSittingSchema });

const RehabPackageUsageSchema = object({ usedSessions: optional(number()) });

export const recordSitting = Workflow.name("healthcare.rehab.recordSitting")
  .input(RecordSittingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordRehabSittingSchema, input);
    const actorId = ctx.actorId ?? "system";

    const sitting = await ctx.step.run("fetch-rehab-sitting", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareRehabSitting)
        .where(eq(healthcareRehabSitting.id, parsed.sittingId))
        .limit(1);
      if (!row) {
        throw new Error("Therapy sitting not found; book the sitting first");
      }
      return row;
    });

    if (parsed.status === "Completed") {
      if (!parsed.preVitals || !parsed.postVitals) {
        throw new Error(
          "Completed sitting needs both pre- and post-therapy vitals; record both sets",
        );
      }
      if (!parsed.modality) {
        throw new Error("Completed sitting needs a modality; record the therapy modality");
      }
    }

    const episode = await ctx.step.run(fetchRehabEpisodeStep, {
      id: sitting.episode_id,
    });
    if (episode.status !== "Active") {
      throw new Error("Rehab episode is discharged; open a new episode for further care");
    }
    if (episode.patient_id !== sitting.patient_id) {
      throw new Error("Patient does not match the rehab episode; check the selected patient");
    }

    const [row] = await ctx.step.run("update-rehab-sitting", async () =>
      ctx.db
        .update(healthcareRehabSitting)
        .set({
          modality: parsed.modality ?? sitting.modality,
          notes: parsed.notes ?? null,
          post_bp_dys: parsed.postVitals.bpDys,
          post_bp_sys: parsed.postVitals.bpSys,
          post_pulse: parsed.postVitals.pulse,
          pre_bp_dys: parsed.preVitals.bpDys,
          pre_bp_sys: parsed.preVitals.bpSys,
          pre_pulse: parsed.preVitals.pulse,
          status: parsed.status,
        })
        .where(eq(healthcareRehabSitting.id, parsed.sittingId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the rehab sitting.");
    }

    if (parsed.status === "Completed") {
      await ctx.step.run("bump-package-usage", async () => {
        const prior = episode.payload.rehabPackage;
        const pkg = is(RehabPackageUsageSchema, prior) ? prior : { usedSessions: 0 };
        const used = (pkg.usedSessions ?? 0) + 1;
        await ctx.db
          .update(healthcareRehabEpisode)
          .set({
            payload: { ...episode.payload, rehabPackage: { ...pkg, usedSessions: used } },
          })
          .where(eq(healthcareRehabEpisode.id, sitting.episode_id));
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });

    return {
      id: row.id,
      postVitals: {
        bpDys: row.post_bp_dys,
        bpSys: row.post_bp_sys,
        pulse: row.post_pulse,
      },
      preVitals: {
        bpDys: row.pre_bp_dys,
        bpSys: row.pre_bp_sys,
        pulse: row.pre_pulse,
      },
      status: row.status,
    };
  });
