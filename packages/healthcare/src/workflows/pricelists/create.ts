import { healthcarePricelist } from "#/db-schemas/billing";
import { SERVICE_EVENTS } from "#/pubsub";
import { CreatePricelistSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toPricelistDto } from "#/workflow-steps/fetch-service";
import {
  assertPricelistCodeAllowed,
  nextPricelistVersion,
} from "#/workflows/shared/pricelist-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreatePricelistInputSchema = object({ input: CreatePricelistSchema });

export const createPricelist = Workflow.name("healthcare.pricelists.create")
  .input(CreatePricelistInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePricelistSchema, input);
    assertPricelistCodeAllowed(parsed.code);
    const [prior] = await ctx.step.run("load-prior-version", async () =>
      ctx.db
        .select({ version: healthcarePricelist.version })
        .from(healthcarePricelist)
        .where(
          and(
            eq(healthcarePricelist.branch_id, parsed.branchId),
            eq(healthcarePricelist.code, parsed.code),
          ),
        )
        .orderBy(desc(healthcarePricelist.version))
        .limit(1),
    );
    const [row] = await ctx.step.run("insert-pricelist", async () =>
      ctx.db
        .insert(healthcarePricelist)
        .values({
          branch_id: parsed.branchId,
          code: parsed.code,
          currency: parsed.currency ?? "INR",
          id: crypto.randomUUID(),
          name: parsed.name,
          payer: parsed.payer ?? null,
          scope: parsed.scope ?? "branch",
          status: "draft",
          tax_inclusive: parsed.taxInclusive ?? true,
          version: nextPricelistVersion(prior?.version),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create pricelist.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
        newState: { branchId: row.branch_id, code: row.code, name: row.name },
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPricelistDto(row);
  });
