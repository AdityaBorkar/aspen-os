import { healthcareAddictionChart } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateWithdrawalChartSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ChartWithdrawalInputSchema = object({
  input: CreateWithdrawalChartSchema,
});

interface WithdrawalBand {
  band: string;
  prompt: string;
}

function withdrawalBand(tool: string, score: number): WithdrawalBand {
  if (tool === "CIWA") {
    if (score < 10) {
      return {
        band: "minimal",
        prompt: "CIWA minimal: routine monitoring and supportive care",
      };
    }
    if (score <= 20) {
      return {
        band: "moderate",
        prompt: "CIWA moderate: consider symptom-triggered medication review",
      };
    }
    return {
      band: "severe",
      prompt: "CIWA severe: escalate urgently for supervised withdrawal care",
    };
  }
  if (score < 13) {
    return {
      band: "mild",
      prompt: "CoWS mild: routine monitoring and supportive care",
    };
  }
  if (score <= 24) {
    return {
      band: "moderate",
      prompt: "CoWS moderate: consider symptom-triggered medication review",
    };
  }
  if (score <= 36) {
    return {
      band: "moderately-severe",
      prompt: "CoWS moderately severe: escalate for supervised withdrawal care",
    };
  }
  return {
    band: "severe",
    prompt: "CoWS severe: escalate urgently for supervised withdrawal care",
  };
}

export const chartWithdrawal = Workflow.name("healthcare.psych.chartWithdrawal")
  .input(ChartWithdrawalInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateWithdrawalChartSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.status !== "open") {
        throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
      }
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }

    const { band, prompt } = withdrawalBand(parsed.tool, parsed.score);
    const nextDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const [row] = await ctx.step.run("insert-addiction-chart", async () =>
      ctx.db
        .insert(healthcareAddictionChart)
        .values({
          band,
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          patient_id: parsed.patientId,
          payload: {
            chartSchedule: parsed.chartSchedule ?? "daily",
            lastUseAt: parsed.lastUseAt ?? null,
            nextDueAt,
            substance: parsed.substance ?? null,
            substanceHistory: parsed.substanceHistory ?? null,
          },
          score: String(parsed.score),
          tool: parsed.tool,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to chart the withdrawal score.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          band,
          id: row.id,
          patientId: row.patient_id,
          tool: row.tool,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      band,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      nextDueAt,
      patientId: row.patient_id,
      prompt,
      score: Number(row.score),
      substance: parsed.substance ?? null,
      tool: row.tool,
    };
  });
