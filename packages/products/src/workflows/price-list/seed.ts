import { productsPriceList } from "#/db-schemas";
import { PRICE_LIST_EVENTS } from "#/pubsub";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  STANDARD_BUYING_PRICE_LIST,
  STANDARD_SELLING_PRICE_LIST,
} from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const seedPriceLists = Workflow.name("products.price-list.seed")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("seed", async () => {
      const standards = [
        { applicability: "selling", name: STANDARD_SELLING_PRICE_LIST },
        { applicability: "buying", name: STANDARD_BUYING_PRICE_LIST },
      ] as const;
      const result: { created: boolean; id: string; name: string }[] = [];
      // oxlint-disable eslint/no-await-in-loop
      for (const standard of standards) {
        const [existing] = await ctx.db
          .select()
          .from(productsPriceList)
          .where(eq(productsPriceList.name, standard.name))
          .limit(1);
        if (existing) {
          result.push({ created: false, id: existing.id, name: existing.name });
          continue;
        }
        const [created] = await ctx.db
          .insert(productsPriceList)
          .values({ applicability: standard.applicability, is_enabled: true, name: standard.name })
          .returning();
        if (!created) {
          throw new Error(`Failed to seed price list "${standard.name}".`);
        }
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: created.id,
          entityType: AUDIT_ENTITY_TYPE.PRICE_LIST,
          newState: { applicability: created.applicability, name: created.name },
        });
        await ctx.pubsub.publish(PRICE_LIST_EVENTS.CREATED, {
          priceList: { id: created.id, name: created.name },
        });
        result.push({ created: true, id: created.id, name: created.name });
      }
      // oxlint-enable eslint/no-await-in-loop
      return result;
    }),
  );
