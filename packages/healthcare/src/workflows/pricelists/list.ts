import { healthcarePricelist } from "#/db-schemas/billing";
import { SERVICE_EVENTS } from "#/pubsub";
import { EnsureDefaultPricelistSchema, PricelistFiltersSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toPricelistDto } from "#/workflow-steps/fetch-service";
import { DEFAULT_PRICELIST_CODE, todayDateString } from "#/workflows/pricelists/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const listPricelists = Workflow.name("healthcare.pricelists.list")
  .input(object({ input: PricelistFiltersSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PricelistFiltersSchema, input);
    const limit = parsed.limit ?? 50;
    const offset = parsed.offset ?? 0;
    const rows = await ctx.step.run("query-pricelists", async () => {
      const branchScope = or(
        eq(healthcarePricelist.branch_id, parsed.branchId),
        eq(healthcarePricelist.scope, "global"),
      );
      const conditions: SQL[] = [];
      if (branchScope) {
        conditions.push(branchScope);
      }
      if (parsed.status) {
        conditions.push(eq(healthcarePricelist.status, parsed.status));
      }
      if (parsed.payer) {
        conditions.push(eq(healthcarePricelist.payer, parsed.payer));
      }
      if (parsed.search) {
        const textMatch = or(
          ilike(healthcarePricelist.code, `%${parsed.search}%`),
          ilike(healthcarePricelist.name, `%${parsed.search}%`),
        );
        if (textMatch) {
          conditions.push(textMatch);
        }
      }
      return ctx.db
        .select()
        .from(healthcarePricelist)
        .where(and(...conditions))
        .orderBy(desc(healthcarePricelist.is_default), asc(healthcarePricelist.code))
        .limit(limit)
        .offset(offset);
    });
    return { items: rows.map(toPricelistDto), limit, offset };
  });

const EnsureDefaultInputSchema = object({ input: EnsureDefaultPricelistSchema });

export const ensureDefaultPricelist = Workflow.name("healthcare.pricelists.ensure-default")
  .input(EnsureDefaultInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EnsureDefaultPricelistSchema, input);
    const [existing] = await ctx.step.run("find-default", async () =>
      ctx.db
        .select()
        .from(healthcarePricelist)
        .where(
          and(
            eq(healthcarePricelist.branch_id, parsed.branchId),
            eq(healthcarePricelist.code, DEFAULT_PRICELIST_CODE),
            eq(healthcarePricelist.status, "published"),
          ),
        )
        .orderBy(desc(healthcarePricelist.version))
        .limit(1),
    );
    if (existing) {
      return { ...toPricelistDto(existing), created: false };
    }
    const [row] = await ctx.step.run("seed-default", async () =>
      ctx.db
        .insert(healthcarePricelist)
        .values({
          branch_id: parsed.branchId,
          code: DEFAULT_PRICELIST_CODE,
          currency: parsed.currency ?? "INR",
          effective_from: todayDateString(),
          id: crypto.randomUUID(),
          is_default: true,
          name: "Default",
          scope: "branch",
          status: "published",
          tax_inclusive: parsed.taxInclusive ?? true,
          version: 1,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to seed the Default pricelist.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: { branchId: row.branch_id, code: row.code },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return { ...toPricelistDto(row), created: true };
  });
