import { healthcareBedAssignment } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { AllocateBedSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const AllocateBedInputSchema = object({ input: AllocateBedSchema });

export const allocateBed = Workflow.name("healthcare.residents.allocate-bed")
  .input(AllocateBedInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AllocateBedSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    if (resident.status !== "admitted") {
      throw new Error("Only admitted residents can be allocated a bed");
    }
    const occupied = await ctx.step.run("check-bed", async () =>
      ctx.db
        .select({ id: healthcareBedAssignment.id })
        .from(healthcareBedAssignment)
        .where(
          and(
            eq(healthcareBedAssignment.branch_id, branchId),
            eq(healthcareBedAssignment.bed_id, parsed.bedId),
            eq(healthcareBedAssignment.status, "occupied"),
          ),
        )
        .limit(1),
    );
    if (occupied.length > 0) {
      throw new Error("Bed is already occupied; pick a vacant bed and retry");
    }
    await ctx.step.run("release-prior", async () =>
      ctx.db
        .update(healthcareBedAssignment)
        .set({ released_at: new Date(), status: "released", updated_at: new Date() })
        .where(
          and(
            eq(healthcareBedAssignment.resident_id, resident.id),
            eq(healthcareBedAssignment.status, "occupied"),
          ),
        ),
    );
    const [row] = await ctx.step.run("allocate-bed", async () =>
      ctx.db
        .insert(healthcareBedAssignment)
        .values({
          bed_id: parsed.bedId,
          branch_id: branchId,
          note: parsed.note ?? null,
          resident_id: resident.id,
          status: "occupied",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to allocate bed.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: resident.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { assignmentId: row.id, bedId: row.bed_id },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: resident.id,
      });
    });
    return { assignmentId: row.id, bedId: row.bed_id, residentId: resident.id };
  });
