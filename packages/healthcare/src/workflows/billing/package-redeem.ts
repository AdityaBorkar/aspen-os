import { healthcarePackageBalance } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { RedeemPackageSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PackageRedeemInputSchema = object({ input: RedeemPackageSchema });

export const packageRedeem = Workflow.name("healthcare.billing.package-redeem")
  .input(PackageRedeemInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RedeemPackageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [sale] = await ctx.step.run("load-package", async () =>
      ctx.db
        .select()
        .from(healthcarePackageBalance)
        .where(eq(healthcarePackageBalance.id, parsed.packageSaleId))
        .limit(1),
    );
    if (!sale) {
      throw new Error("Package sale not found; verify the package id and retry");
    }
    if (sale.status !== "active") {
      throw new Error("Package is not active; only active packages can be redeemed");
    }
    if (sale.expires_at && sale.expires_at.getTime() < Date.now()) {
      await ctx.step.run("lapse-package", async () =>
        ctx.db
          .update(healthcarePackageBalance)
          .set({ status: "expired", updated_at: new Date() })
          .where(eq(healthcarePackageBalance.id, sale.id)),
      );
      throw new Error("Package has expired; the balance has lapsed — sell a new package");
    }
    const qty = parsed.qty ?? 1;
    const left = (sale.balance[parsed.serviceId] ?? qty) - qty;
    if (left < 0) {
      throw new Error("Redeem would make balance negative; check the remaining sessions and retry");
    }
    const nextStatus = Object.values({ ...sale.balance, [parsed.serviceId]: left }).every(
      (value) => value <= 0,
    )
      ? "exhausted"
      : sale.status;
    const [row] = await ctx.step.run("redeem-package", async () =>
      ctx.db
        .update(healthcarePackageBalance)
        .set({
          balance: { ...sale.balance, [parsed.serviceId]: left },
          payload: (() => {
            // SAFETY: redemptions are written by this workflow as plain JSON objects, so
            // reading them back as JsonValue only satisfies the jsonb element check.
            const prior = (sale.payload?.redemptions as JsonValue[]) ?? [];
            return {
              ...sale.payload,
              redemptions: [
                ...prior,
                { qty, redeemedAt: new Date().toISOString(), serviceId: parsed.serviceId },
              ],
            };
          })(),
          status: nextStatus,
          updated_at: new Date(),
        })
        .where(eq(healthcarePackageBalance.id, sale.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to redeem package.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { remaining: left, serviceId: parsed.serviceId },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { remaining: left, serviceId: parsed.serviceId };
  });
