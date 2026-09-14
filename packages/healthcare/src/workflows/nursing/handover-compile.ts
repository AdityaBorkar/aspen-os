import { healthcareHandover, healthcareNursingTask } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordHandoverSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const HandoverCompileInputSchema = object({ input: RecordHandoverSchema });

export const handoverCompile = Workflow.name("healthcare.nursing.handover-compile")
  .input(HandoverCompileInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordHandoverSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (parsed.fromShift === parsed.toShift) {
      throw new Error("Handover needs two different shifts; check from/to and retry");
    }
    const open = await ctx.step.run("load-open-tasks", async () =>
      ctx.db
        .select({ id: healthcareNursingTask.id })
        .from(healthcareNursingTask)
        .where(
          and(
            eq(healthcareNursingTask.branch_id, branchId),
            eq(healthcareNursingTask.status, "open"),
          ),
        )
        .limit(500),
    );
    const [row] = await ctx.step.run("insert-handover", async () =>
      ctx.db
        .insert(healthcareHandover)
        .values({
          branch_id: branchId,
          from_shift: parsed.fromShift,
          notes: parsed.notes,
          open_tasks: open.map((task) => task.id),
          status: "draft",
          to_shift: parsed.toShift,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to compile handover.");
    }
    // Unsigned-handover flag: earlier drafts still awaiting sign-off stay
    // visible on the dashboard until signed.
    const unsignedCount = await ctx.step.run("count-unsigned", async () => {
      const drafts = await ctx.db
        .select({ id: healthcareHandover.id })
        .from(healthcareHandover)
        .where(
          and(eq(healthcareHandover.branch_id, branchId), eq(healthcareHandover.status, "draft")),
        )
        .limit(100);
      return drafts.length;
    });
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: {
          fromShift: row.from_shift,
          openTasks: row.open_tasks.length,
          toShift: row.to_shift,
        },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      handoverId: row.id,
      openTasks: row.open_tasks.length,
      status: row.status,
      unsignedCount,
      unsignedFlag: unsignedCount > 0,
    };
  });
