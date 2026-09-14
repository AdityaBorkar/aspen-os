import { healthcareSeedRun } from "#/db-schemas/operations";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { SeedPresetsSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SeedPresetsInputSchema = object({ input: SeedPresetsSchema });

export const seedPresets = Workflow.name("healthcare.operations.seed-presets")
  .input(SeedPresetsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SeedPresetsSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-seed-run", async () =>
      ctx.db
        .insert(healthcareSeedRun)
        .values({ branch_id: branchId, preset: parsed.preset, status: "seeded" })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record seed run.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { preset: row.preset, status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { preset: row.preset, seedId: row.id };
  });
