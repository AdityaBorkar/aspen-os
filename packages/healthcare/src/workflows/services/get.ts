import { healthcareDiscountRule, healthcareServicePrice } from "#/db-schemas/services";
import { ServiceIdSchema } from "#/schemas/services";
import {
  fetchServiceStep,
  toDiscountRuleDto,
  toServiceDto,
  toServicePriceDto,
} from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetServiceInputSchema = object({ input: ServiceIdSchema });

export const getService = Workflow.name("healthcare.services.get")
  .input(GetServiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ServiceIdSchema, input);
    const service = await ctx.step.run(fetchServiceStep, { id: parsed.id });
    const [prices, discountRules] = await ctx.step.run("fetch-aggregate", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareServicePrice)
          .where(eq(healthcareServicePrice.service_id, parsed.id))
          .orderBy(desc(healthcareServicePrice.effective_from))
          .limit(100),
        ctx.db
          .select()
          .from(healthcareDiscountRule)
          .where(eq(healthcareDiscountRule.service_id, parsed.id))
          .limit(100),
      ]),
    );
    return {
      discountRules: discountRules.map(toDiscountRuleDto),
      prices: prices.map(toServicePriceDto),
      service: toServiceDto(service),
    };
  });
