import { healthcarePricelist } from "#/db-schemas/billing";
import { SERVICE_EVENTS } from "#/pubsub";
import { PricelistIdSchema, PublishPricelistSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPricelistStep, toPricelistDto } from "#/workflow-steps/fetch-service";
import { todayDateString } from "#/workflows/pricelists/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

export const getPricelist = Workflow.name("healthcare.pricelists.get")
  .input(object({ input: PricelistIdSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PricelistIdSchema, input);
    const row = await ctx.step.run(fetchPricelistStep, { id: parsed.id });
    return toPricelistDto(row);
  });

function rangesOverlap(
  current: { from: string | null; to: string | null },
  existing: { from: string | null; to: string | null },
): boolean {
  let start: string | null | undefined = undefined;
  if (current.from && existing.from) {
    start = current.from > existing.from ? current.from : existing.from;
  } else {
    start = current.from ?? existing.from;
  }
  let end: string | null | undefined = undefined;
  if (current.to && existing.to) {
    end = current.to < existing.to ? current.to : existing.to;
  } else {
    end = current.to ?? existing.to;
  }
  if (!start || !end) {
    return true;
  }
  return start <= end;
}

export const publishPricelist = Workflow.name("healthcare.pricelists.publish")
  .input(object({ input: PublishPricelistSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PublishPricelistSchema, input);
    const existing = await ctx.step.run(fetchPricelistStep, { id: parsed.id });
    if (existing.status === "published") {
      throw new Error(`Pricelist "${existing.code}" is already published.`);
    }
    if (existing.status === "inactive") {
      throw new Error(`Pricelist "${existing.code}" is retired; create a new version instead.`);
    }
    const effectiveFrom = parsed.effectiveFrom ?? todayDateString();
    const effectiveTo = parsed.effectiveTo ?? null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new Error("Effective-to cannot be before effective-from.");
    }

    const siblings = await ctx.step.run("load-siblings", async () =>
      ctx.db
        .select()
        .from(healthcarePricelist)
        .where(
          and(
            eq(healthcarePricelist.branch_id, existing.branch_id),
            eq(healthcarePricelist.code, existing.code),
            eq(healthcarePricelist.status, "published"),
            ne(healthcarePricelist.id, existing.id),
          ),
        )
        .limit(50),
    );
    for (const sibling of siblings) {
      if (
        rangesOverlap(
          { from: effectiveFrom, to: effectiveTo },
          { from: sibling.effective_from, to: sibling.effective_to },
        )
      ) {
        throw new Error(
          `Pricelist "${existing.code}" already has a published version covering ${sibling.effective_from ?? "…"}–${sibling.effective_to ?? "…"}; overlapping effective ranges are rejected.`,
        );
      }
    }

    const [row] = await ctx.step.run("publish-pricelist", async () =>
      ctx.db
        .update(healthcarePricelist)
        .set({
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
          status: "published",
          updated_at: new Date(),
        })
        .where(eq(healthcarePricelist.id, existing.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to publish pricelist "${existing.code}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { effectiveFrom, effectiveTo, status: "published" },
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

export const retirePricelist = Workflow.name("healthcare.pricelists.retire")
  .input(object({ input: PricelistIdSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PricelistIdSchema, input);
    const existing = await ctx.step.run(fetchPricelistStep, { id: parsed.id });
    if (existing.status === "inactive") {
      throw new Error(`Pricelist "${existing.code}" is already retired.`);
    }
    if (existing.is_default) {
      throw new Error(
        "The Default pricelist can never be retired; it is the terminal fallback for all pricing.",
      );
    }
    const [row] = await ctx.step.run("retire-pricelist", async () =>
      ctx.db
        .update(healthcarePricelist)
        .set({ status: "inactive", updated_at: new Date() })
        .where(eq(healthcarePricelist.id, existing.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to retire pricelist "${existing.code}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { status: "inactive" },
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
