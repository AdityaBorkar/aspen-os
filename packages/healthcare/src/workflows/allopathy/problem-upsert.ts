import { healthcareProblem } from "#/db-schemas/allopathy";
import { healthcareCondition } from "#/db-schemas/condition";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateProblemSchema, UpdateProblemSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, parse, union, is, string } from "valibot";

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
    const rawBranchId = "branchId" in input ? input.branchId : undefined;
    const branchId = is(string(), rawBranchId) ? rawBranchId : "main";
    const actorId = ctx.actorId ?? "system";

    if ("problemId" in input) {
      const parsed = parse(UpdateProblemSchema, input);
      const [row] = await ctx.step.run("update-problem", async () =>
        // Fail-both: legacy status update and canonical clinical_status
        // sync commit together so the problem list and the unified
        // Condition never diverge. Canonical rows are located through
        // payload.fhir.absorbed_from written at absorption time.
        ctx.db.transaction(async (tx) => {
          const [problem] = await tx
            .update(healthcareProblem)
            .set({ status: parsed.status })
            .where(eq(healthcareProblem.id, parsed.problemId))
            .returning();
          if (!problem) {
            throw new Error("Problem not found; check the problem ID");
          }
          await tx
            .update(healthcareCondition)
            .set({ clinical_status: problem.status })
            .where(
              sql`${healthcareCondition.payload}->'fhir'->'absorbed_from'->>'id' = ${parsed.problemId}`,
            );
          return [problem];
        }),
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
    if (parsed.encounterId) {
      // Sign-freeze: visit-scoped problems only land on open encounters;
      // signed (finished) encounters only accept encounter_addendum writes.
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }
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
      // Dual-write (HEALTHCARE-SPEC §§5, 13): system→code_system,
      // status→clinical_status (active/resolved are canonical), and
      // verification_status defaults to unconfirmed unless the canonical
      // alias was provided. Reads stay on healthcare_problem until cutover.
      ctx.db.transaction(async (tx) => {
        const [problem] = await tx
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
          .returning();
        if (!problem) {
          throw new Error("Failed to save the problem.");
        }
        await tx.insert(healthcareCondition).values({
          branch_id: branchId,
          clinical_status: problem.status,
          code: problem.code,
          code_system: problem.system,
          encounter_id: problem.encounter_id,
          id: crypto.randomUUID(),
          label: problem.label ?? problem.code,
          onset_at: null,
          patient_id: problem.patient_id,
          payload: {
            fhir: { absorbed_from: { id: problem.id, table: "healthcare_problem" } },
          },
          rank: null,
          recorded_by: actorId,
          verification_status: parsed.verificationStatus ?? "unconfirmed",
        });
        return [problem];
      }),
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
