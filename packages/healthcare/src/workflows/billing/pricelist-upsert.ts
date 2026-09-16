import { healthcarePricelist } from "#/db-schemas/billing";
import { healthcareServicePrice } from "#/db-schemas/services";
import { BILLING_EVENTS } from "#/pubsub";
import { CreatePricelistSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { todayDateString } from "#/workflows/pricelists/shared";
import {
  assertPricelistCodeAllowed,
  nextPricelistVersion,
  toPricelistCode,
} from "#/workflows/shared/pricelist-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PricelistUpsertInputSchema = object({ input: CreatePricelistSchema });

export const pricelistUpsert = Workflow.name("healthcare.billing.pricelist-upsert")
  .input(PricelistUpsertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePricelistSchema, input);
    const branchId = parsed.branchId ?? "main";
    const code = toPricelistCode(parsed.name);
    assertPricelistCodeAllowed(code);
    const [prior] = await ctx.step.run("load-prior-version", async () =>
      ctx.db
        .select({ version: healthcarePricelist.version })
        .from(healthcarePricelist)
        .where(and(eq(healthcarePricelist.branch_id, branchId), eq(healthcarePricelist.code, code)))
        .orderBy(desc(healthcarePricelist.version))
        .limit(1),
    );
    const [row] = await ctx.step.run("insert-pricelist-version", async () =>
      ctx.db
        .insert(healthcarePricelist)
        .values({
          branch_id: branchId,
          code,
          name: parsed.name,
          rates: parsed.rates,
          version: nextPricelistVersion(prior?.version),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to upsert pricelist.");
    }
    if (parsed.rates.length > 0) {
      await ctx.step.run("mirror-service-prices", async () =>
        ctx.db.insert(healthcareServicePrice).values(
          parsed.rates.map((rate) => ({
            amount: String(rate.price),
            branch_id: branchId,
            effective_from: todayDateString(),
            pricelist: code,
            pricelist_id: row.id,
            service_id: rate.serviceId,
          })),
        ),
      );
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { code: row.code, name: row.name, version: row.version },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      code: row.code,
      id: row.id,
      name: row.name,
      rates: row.rates,
      version: row.version,
    };
  });
