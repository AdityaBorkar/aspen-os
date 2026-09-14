import { healthcarePackageBalance } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { CreatePackageBalanceSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PackageSellInputSchema = object({ input: CreatePackageBalanceSchema });

export const packageSell = Workflow.name("healthcare.billing.package-sell")
  .input(PackageSellInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePackageBalanceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const validityDays = parsed.validityDays ?? 180;
    const [row] = await ctx.step.run("insert-package", async () =>
      ctx.db
        .insert(healthcarePackageBalance)
        .values({
          balance: {},
          branch_id: branchId,
          expires_at: new Date(Date.now() + validityDays * 86_400_000),
          package_id: parsed.packageId,
          patient_id: parsed.patientId,
          price: String(parsed.price),
          status: "active",
          validity_days: validityDays,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to sell package.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { packageId: row.package_id, patientId: row.patient_id, status: row.status },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      expiresAt: row.expires_at?.toISOString() ?? null,
      id: row.id,
      packageId: row.package_id,
      patientId: row.patient_id,
      status: row.status,
    };
  });
