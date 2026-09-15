import { healthcarePricelist } from "#/db-schemas/billing";
import { SERVICE_EVENTS } from "#/pubsub";
import { UpdatePricelistSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPricelistStep, toPricelistDto } from "#/workflow-steps/fetch-service";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdatePricelistInputSchema = object({ input: UpdatePricelistSchema });

export const updatePricelist = Workflow.name("healthcare.pricelists.update")
  .input(UpdatePricelistInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdatePricelistSchema, input);
    const existing = await ctx.step.run(fetchPricelistStep, { id: parsed.id });
    if (existing.status !== "draft") {
      throw new Error(
        `Only draft pricelists can be edited; "${existing.code}" is ${existing.status} — create a new version instead.`,
      );
    }
    const [row] = await ctx.step.run("update-pricelist", async () =>
      ctx.db
        .update(healthcarePricelist)
        .set({
          currency: parsed.patch.currency ?? existing.currency,
          name: parsed.patch.name ?? existing.name,
          payer: parsed.patch.payer ?? existing.payer,
          scope: parsed.patch.scope ?? existing.scope,
          tax_inclusive: parsed.patch.taxInclusive ?? existing.tax_inclusive,
          updated_at: new Date(),
        })
        .where(eq(healthcarePricelist.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to update pricelist "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      const changes: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(parsed.patch)) {
        if (value !== undefined) {
          // SAFETY: patch values are validated primitives, JSON-safe by construction.
          changes[key] = value;
        }
      }
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPricelistDto(row);
  });
