import { ResolvePriceSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPricelistStep, fetchServiceStep } from "#/workflow-steps/fetch-service";
import {
  DEFAULT_PRICELIST_CODE,
  findPublishedPricelist,
  pickServicePrice,
  todayDateString,
} from "#/workflows/pricelists/shared";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ResolvePriceInputSchema = object({ input: ResolvePriceSchema });

export const resolveServicePrice = Workflow.name("healthcare.pricelists.resolve-price")
  .input(ResolvePriceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResolvePriceSchema, input);
    const date = parsed.date ?? todayDateString();
    const service = await ctx.step.run(fetchServiceStep, { id: parsed.serviceId });

    if (parsed.pricelistId) {
      const pricelist = await ctx.step.run(fetchPricelistStep, { id: parsed.pricelistId });
      if (pricelist.status !== "published") {
        throw new Error(
          `Pricelist "${pricelist.code}" is ${pricelist.status}; only published pricelists resolve prices.`,
        );
      }
      const hit = await ctx.step.run("pick-requested-price", () =>
        pickServicePrice(ctx.db, {
          branchId: parsed.branchId,
          date,
          pricelist: {
            branchId: pricelist.branch_id,
            code: pricelist.code,
            id: pricelist.id,
            name: pricelist.name,
            taxInclusive: pricelist.tax_inclusive,
          },
          serviceId: parsed.serviceId,
        }),
      );
      if (hit) {
        return { ...hit, serviceId: parsed.serviceId };
      }
    } else if (parsed.payer) {
      const payerList = await ctx.step.run("find-payer-pricelist", () =>
        findPublishedPricelist(ctx.db, {
          branchId: parsed.branchId,
          date,
          payer: parsed.payer,
        }),
      );
      if (payerList) {
        const hit = await ctx.step.run("pick-payer-price", () =>
          pickServicePrice(ctx.db, {
            branchId: parsed.branchId,
            date,
            pricelist: payerList,
            serviceId: parsed.serviceId,
          }),
        );
        if (hit) {
          return { ...hit, serviceId: parsed.serviceId };
        }
      }
    }

    const fallbackList = await ctx.step.run("find-default-pricelist", () =>
      findPublishedPricelist(ctx.db, {
        branchId: parsed.branchId,
        code: DEFAULT_PRICELIST_CODE,
        date,
      }),
    );
    if (fallbackList) {
      const hit = await ctx.step.run("pick-default-price", () =>
        pickServicePrice(ctx.db, {
          branchId: parsed.branchId,
          date,
          pricelist: fallbackList,
          serviceId: parsed.serviceId,
        }),
      );
      if (hit) {
        return { ...hit, fallback: true, serviceId: parsed.serviceId };
      }
    }

    await ctx.step.run("audit-miss", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.OVERRIDE,
        entityId: parsed.serviceId,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        metadata: { branchId: parsed.branchId, payer: parsed.payer ?? null, reason: "price-miss" },
      });
    });

    throw new Error(
      `No rate for service "${service.code}" on ${parsed.pricelistId ? "the requested pricelist" : parsed.payer ? `the "${parsed.payer}" pricelist` : "a payer pricelist"} nor Default (branch "${parsed.branchId}"); add a price before billing — zero-rating is forbidden.`,
    );
  });
