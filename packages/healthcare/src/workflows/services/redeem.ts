import { healthcarePackageDef } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { RedeemPackageSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPackageStep, readPackageCounters } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RedeemPackageInputSchema = object({ input: RedeemPackageSchema });

export const redeemPackage = Workflow.name("healthcare.services.redeem")
  .input(RedeemPackageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RedeemPackageSchema, input);
    const existing = await ctx.step.run(fetchPackageStep, {
      id: parsed.packageId,
    });
    const counters = readPackageCounters(existing.payload);
    const remaining = counters.totalRedemptions - counters.redeemedCount;
    if (remaining <= 0) {
      throw new Error(
        `Package "${parsed.packageId}" is exhausted (${counters.redeemedCount}/${counters.totalRedemptions} redeemed); balance cannot go negative.`,
      );
    }
    const redemptionId = crypto.randomUUID();
    const redeemedAt = new Date().toISOString();
    const redemptions = [
      ...counters.redemptions,
      { id: redemptionId, patientId: parsed.patientId, redeemedAt },
    ];
    const [row] = await ctx.step.run("apply-redemption", async () =>
      ctx.db
        .update(healthcarePackageDef)
        .set({
          payload: {
            ...existing.payload,
            redeemedCount: counters.redeemedCount + 1,
            redemptions,
          },
          updated_at: new Date(),
        })
        .where(eq(healthcarePackageDef.id, parsed.packageId))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to redeem package "${parsed.packageId}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { redeemedCount: counters.redeemedCount + 1 },
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: redeemedAt,
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return {
      branchId: row.branch_id,
      id: redemptionId,
      packageId: parsed.packageId,
      patientId: parsed.patientId,
      redeemedAt,
      remaining: remaining - 1,
    };
  });
