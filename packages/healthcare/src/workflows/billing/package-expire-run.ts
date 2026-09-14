import { healthcarePackageBalance } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { DuesAgingFiltersSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PackageExpireRunInputSchema = object({ input: DuesAgingFiltersSchema });

export const packageExpireRun = Workflow.name("healthcare.billing.package-expire-run")
  .input(PackageExpireRunInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DuesAgingFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const sales = await ctx.step.run("load-packages", async () =>
      ctx.db
        .select()
        .from(healthcarePackageBalance)
        .where(
          and(
            eq(healthcarePackageBalance.branch_id, branchId),
            eq(healthcarePackageBalance.status, "active"),
          ),
        )
        .limit(1000),
    );
    const now = Date.now();
    const lapsed: string[] = [];
    for (const sale of sales) {
      if (sale.expires_at && sale.expires_at.getTime() < now) {
        await ctx.step.run(`lapse-${sale.id}`, async () =>
          ctx.db
            .update(healthcarePackageBalance)
            .set({ status: "expired", updated_at: new Date() })
            .where(eq(healthcarePackageBalance.id, sale.id)),
        );
        lapsed.push(sale.id);
      }
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: `${lapsed.length}`,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { lapsed },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: `${lapsed.length}`,
      });
    });
    return { lapsed };
  });
