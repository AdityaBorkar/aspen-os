import { healthcareProblem } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateProblemSchema, UpdateProblemSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse, union } from "valibot";

const ProblemUpsertInputSchema = object({
  input: union([CreateProblemSchema, UpdateProblemSchema]),
});

function toDto(row: typeof healthcareProblem.$inferSelect) {
  return {
    branchId: row.branch_id,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    encounterId: row.encounter_id,
    id: row.id,
    label: row.label,
    patientId: row.patient_id,
    status: row.status,
    system: row.system,
  };
}

export const problemUpsert = Workflow.name("healthcare.allopathy.problemUpsert")
  .input(ProblemUpsertInputSchema)
  .handler(async ({ input }, ctx) => {
    const branchId =
      "branchId" in input && typeof input.branchId === "string" ? input.branchId : "main";
    const actorId = ctx.actorId ?? "system";

    if ("problemId" in input) {
      const parsed = parse(UpdateProblemSchema, input);
      const [row] = await ctx.step.run("update-problem", async () =>
        ctx.db
          .update(healthcareProblem)
          .set({ status: parsed.status })
          .where(eq(healthcareProblem.id, parsed.problemId))
          .returning(),
      );
      if (!row) {
        throw new Error("Problem not found; check the problem ID");
      }
      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.UPDATED,
          crudAction: "update",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
          newState: { id: row.id, status: row.status },
        });
        await ctx.pubsub.publish(ALLOPATHY_EVENTS.UPDATED, {
          actorId,
          at: new Date().toISOString(),
          branchId: row.branch_id,
          id: row.id,
        });
      });
      return toDto(row);
    }

    const parsed = parse(CreateProblemSchema, input);
    const duplicate = await ctx.step.run("check-duplicate", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareProblem.id })
        .from(healthcareProblem)
        .where(
          and(
            eq(healthcareProblem.patient_id, parsed.patientId),
            eq(healthcareProblem.code, parsed.code),
            eq(healthcareProblem.status, "active"),
          ),
        )
        .limit(1);
      return row ?? null;
    });
    if (duplicate) {
      throw new Error(
        `Problem "${parsed.code}" is already active for this patient; resolve it before re-adding.`,
      );
    }
    const [row] = await ctx.step.run("insert-problem", async () =>
      ctx.db
        .insert(healthcareProblem)
        .values({
          branch_id: branchId,
          code: parsed.code,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          label: parsed.label ?? null,
          patient_id: parsed.patientId,
          status: parsed.status,
          system: parsed.system,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the problem.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: { code: row.code, id: row.id, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(ALLOPATHY_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });
    return toDto(row);
  });
