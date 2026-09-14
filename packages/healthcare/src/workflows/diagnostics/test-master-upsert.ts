import { healthcareLabTest } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { TestMasterSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const TestMasterInputSchema = object({ input: TestMasterSchema });

export const testMasterUpsert = Workflow.name("healthcare.diagnostics.test-master-upsert")
  .input(TestMasterInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TestMasterSchema, input);
    const branchId = parsed.branchId ?? "main";

    const existing = await ctx.step.run("find-by-code", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareLabTest)
        .where(
          and(eq(healthcareLabTest.branch_id, branchId), eq(healthcareLabTest.code, parsed.code)),
        )
        .limit(1);
      return row ?? null;
    });

    const values = {
      branch_id: branchId,
      code: parsed.code,
      name: parsed.name,
      price: parsed.price === undefined ? null : String(parsed.price),
      ref_high: parsed.refHigh === undefined ? null : String(parsed.refHigh),
      ref_low: parsed.refLow === undefined ? null : String(parsed.refLow),
      specimen: parsed.specimen ?? null,
      turnaround_hrs: parsed.turnaroundHrs ?? null,
    };
    const saved = await ctx.step.run("upsert-test", async () => {
      if (existing) {
        const [row] = await ctx.db
          .update(healthcareLabTest)
          .set(values)
          .where(eq(healthcareLabTest.id, existing.id))
          .returning();
        if (!row) {
          throw new Error("Failed to update lab test.");
        }
        return { created: false, row };
      }
      const [row] = await ctx.db.insert(healthcareLabTest).values(values).returning();
      if (!row) {
        throw new Error("Failed to create lab test.");
      }
      return { created: true, row };
    });

    const dto = {
      code: saved.row.code,
      created: saved.created,
      id: saved.row.id,
      name: saved.row.name,
      price: saved.row.price === null ? null : Number(saved.row.price),
      refHigh: saved.row.ref_high === null ? null : Number(saved.row.ref_high),
      refLow: saved.row.ref_low === null ? null : Number(saved.row.ref_low),
      specimen: saved.row.specimen,
      turnaroundHrs: saved.row.turnaround_hrs,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: saved.created ? AUDIT_ACTION.CREATED : AUDIT_ACTION.UPDATED,
        crudAction: saved.created ? "create" : "update",
        entityId: saved.row.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { code: saved.row.code, id: saved.row.id, name: saved.row.name },
      });
      await ctx.pubsub.publish(
        saved.created ? DIAGNOSTICS_EVENTS.CREATED : DIAGNOSTICS_EVENTS.UPDATED,
        {
          actorId: ctx.actorId,
          at: new Date().toISOString(),
          branchId,
          id: saved.row.id,
        },
      );
    });
    return dto;
  });
