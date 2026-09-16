import { healthcareLabPanel, healthcareLabTest } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { PanelSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const PanelInputSchema = object({ input: PanelSchema });

export const panelCreate = Workflow.name("diagnostics.panel-create")
  .input(PanelInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PanelSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (parsed.testIds.length === 0) {
      throw new Error("Panel needs at least one test.");
    }
    const known = await ctx.step.run("verify-tests", async () => {
      const rows = await ctx.db
        .select({ id: healthcareLabTest.id })
        .from(healthcareLabTest)
        .where(
          and(
            eq(healthcareLabTest.branch_id, branchId),
            inArray(healthcareLabTest.id, parsed.testIds),
          ),
        );
      return new Set(rows.map((row) => row.id));
    });
    const missing = parsed.testIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      throw new Error(`Unknown test ids: ${missing.join(", ")}; create the test masters first.`);
    }

    const created = await ctx.step.run("create-panel", async () => {
      const [row] = await ctx.db
        .insert(healthcareLabPanel)
        .values({ branch_id: branchId, name: parsed.name, test_ids: parsed.testIds })
        .returning();
      if (!row) {
        throw new Error("Failed to create panel.");
      }
      return row;
    });

    const dto = {
      createdAt: created.created_at.toISOString(),
      id: created.id,
      name: created.name,
      testIds: created.test_ids,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { id: created.id, name: created.name },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
