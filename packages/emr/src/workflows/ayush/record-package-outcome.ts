import { healthcareTherapyPackage } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { PackageOutcomeSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { remainingSessions } from "#/workflows/shared/package-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PackageOutcomeInputSchema = object({ input: PackageOutcomeSchema });

export const recordPackageOutcome = Workflow.name("emr.ayush.record-package-outcome")
  .input(PackageOutcomeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PackageOutcomeSchema, input);
    const actorId = ctx.actorId ?? "system";

    const pkg = await ctx.step.run("fetch-therapy-package", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareTherapyPackage)
        .where(eq(healthcareTherapyPackage.id, parsed.packageId))
        .limit(1);
      if (!row) {
        throw new Error("Therapy package not found; sell the package first");
      }
      return row;
    });

    const [row] = await ctx.step.run("record-outcome", async () =>
      ctx.db
        .update(healthcareTherapyPackage)
        .set({
          payload: { ...pkg.payload, outcomeNote: parsed.outcomeNote },
          status: "Completed",
        })
        .where(eq(healthcareTherapyPackage.id, parsed.packageId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the package outcome.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });

    return {
      attended: row.used_sittings ?? 0,
      id: row.id,
      outcomeNote: parsed.outcomeNote,
      remaining: remainingSessions(row.total_sittings, row.used_sittings ?? 0),
      status: row.status,
      totalSittings: row.total_sittings,
    };
  });
