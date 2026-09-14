import { healthcareTherapyPackage } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { PauseExtendPackageSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PauseExtendInputSchema = object({ input: PauseExtendPackageSchema });

interface TherapyPackagePatch {
  status?: string;
  used_sittings?: number;
  valid_till?: Date | null;
}

export const pauseExtendPackage = Workflow.name("healthcare.ayush.pauseExtendPackage")
  .input(PauseExtendInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PauseExtendPackageSchema, input);
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

    const patch: TherapyPackagePatch = {};
    if (parsed.action === "pause") {
      patch.status = "Paused";
    }
    if (parsed.action === "resume") {
      patch.status = "Active";
    }
    if (parsed.action === "complete") {
      patch.status = "Completed";
    }
    if (parsed.action === "extend") {
      if (!parsed.extendDays) {
        throw new Error("Extension needs a day count; pass extendDays");
      }
      const current = (pkg.valid_till ?? new Date()).getTime();
      patch.valid_till = new Date(current + parsed.extendDays * 24 * 60 * 60 * 1000);
      patch.status = "Active";
    }

    const [row] = await ctx.step.run("update-therapy-package", async () =>
      ctx.db
        .update(healthcareTherapyPackage)
        .set({
          ...patch,
          payload: parsed.reason ? { ...pkg.payload, lastNote: parsed.reason } : pkg.payload,
        })
        .where(eq(healthcareTherapyPackage.id, parsed.packageId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to update the therapy package.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          action: parsed.action,
          id: row.id,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });

    return {
      action: parsed.action,
      id: row.id,
      status: row.status,
      validTill: row.valid_till ? row.valid_till.toISOString() : null,
    };
  });
