import { healthcareRehabEpisode } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateRehabPackageSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const BuildPackageInputSchema = object({ input: CreateRehabPackageSchema });

export const buildPackage = Workflow.name("healthcare.rehab.buildPackage")
  .input(BuildPackageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRehabPackageSchema, input);
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

    const rehabPackage = {
      frequency: parsed.frequency,
      modalities: parsed.modalities ?? [],
      price: parsed.price ?? null,
      soldAt: new Date().toISOString(),
      totalSessions: parsed.totalSessions,
      usedSessions: 0,
      validityDays: parsed.validityDays ?? null,
    } satisfies Record<string, JsonValue>;
    const [row] = await ctx.step.run("store-rehab-package", async () =>
      ctx.db
        .update(healthcareRehabEpisode)
        .set({ payload: { ...episode.payload, rehabPackage } })
        .where(eq(healthcareRehabEpisode.id, parsed.episodeId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to build the rehab package.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          episodeId: row.id,
          frequency: parsed.frequency,
          id: row.id,
          patientId: row.patient_id,
          totalSessions: parsed.totalSessions,
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
      episodeId: row.id,
      expiry: expiryOf(rehabPackage),
      frequency: parsed.frequency,
      id: row.id,
      modalities: parsed.modalities ?? [],
      patientId: row.patient_id,
      price: parsed.price ?? null,
      remaining: parsed.totalSessions,
      totalSessions: parsed.totalSessions,
      usedSessions: 0,
      validityDays: parsed.validityDays ?? null,
    };
  });

function expiryOf(pkg: { soldAt: string; validityDays: number | null }): string | null {
  if (pkg.validityDays === null) {
    return null;
  }
  const expiry = new Date(pkg.soldAt).getTime() + pkg.validityDays * 86_400_000;
  return new Date(expiry).toISOString().slice(0, 10);
}
