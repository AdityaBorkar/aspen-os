import { healthcarePricelist } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { CreatePricelistSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PricelistUpsertInputSchema = object({ input: CreatePricelistSchema });

export const pricelistUpsert = Workflow.name("healthcare.billing.pricelist-upsert")
  .input(PricelistUpsertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePricelistSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [prior] = await ctx.step.run("load-prior-version", async () =>
      ctx.db
        .select({ version: healthcarePricelist.version })
        .from(healthcarePricelist)
        .where(
          and(
            eq(healthcarePricelist.branch_id, branchId),
            eq(healthcarePricelist.name, parsed.name),
          ),
        )
        .orderBy(desc(healthcarePricelist.version))
        .limit(1),
    );
    const [row] = await ctx.step.run("insert-pricelist-version", async () =>
      ctx.db
        .insert(healthcarePricelist)
        .values({
          branch_id: branchId,
          name: parsed.name,
          rates: parsed.rates,
          version: (prior?.version ?? 0) + 1,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to upsert pricelist.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { name: row.name, version: row.version },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      id: row.id,
      name: row.name,
      rates: row.rates,
      version: row.version,
    };
  });
