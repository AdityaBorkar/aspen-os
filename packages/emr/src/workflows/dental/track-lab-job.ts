import { healthcareLabJob } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { TrackLabJobSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const TrackLabJobInputSchema = object({ input: TrackLabJobSchema });

export const trackLabJob = Workflow.name("emr.dental.track-lab-job")
  .input(TrackLabJobInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TrackLabJobSchema, input);
    const actorId = ctx.actorId ?? "system";

    const job = await ctx.step.run("fetch-lab-job", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareLabJob)
        .where(eq(healthcareLabJob.id, parsed.labJobId))
        .limit(1);
      if (!row) {
        throw new Error("Lab job not found; raise the lab job first");
      }
      return row;
    });

    const nowIso = new Date().toISOString();
    const [row] = await ctx.step.run("update-lab-job-status", async () =>
      ctx.db
        .update(healthcareLabJob)
        .set({
          history: [
            ...job.history,
            { at: nowIso, note: parsed.note ?? null, status: parsed.status },
          ],
          status: parsed.status,
        })
        .where(eq(healthcareLabJob.id, parsed.labJobId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to track the lab job.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });

    return {
      history: row.history,
      id: row.id,
      status: row.status,
    };
  });
