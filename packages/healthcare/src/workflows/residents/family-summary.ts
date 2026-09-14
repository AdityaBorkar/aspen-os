import {
  healthcareDailyLog,
  healthcareGeriatricScore,
  healthcareRound,
} from "#/db-schemas/residents";
import { ResidentIdSchema } from "#/schemas/residents";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const FamilySummaryInputSchema = object({ input: ResidentIdSchema });

export const familySummary = Workflow.name("healthcare.residents.family-summary")
  .input(FamilySummaryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResidentIdSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.id });
    const [scores, logs, rounds] = await ctx.step.run("load-summary", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareGeriatricScore)
          .where(
            and(
              eq(healthcareGeriatricScore.branch_id, branchId),
              eq(healthcareGeriatricScore.resident_id, resident.id),
            ),
          )
          .orderBy(desc(healthcareGeriatricScore.created_at))
          .limit(10),
        ctx.db
          .select()
          .from(healthcareDailyLog)
          .where(
            and(
              eq(healthcareDailyLog.branch_id, branchId),
              eq(healthcareDailyLog.resident_id, resident.id),
            ),
          )
          .orderBy(desc(healthcareDailyLog.created_at))
          .limit(10),
        ctx.db
          .select()
          .from(healthcareRound)
          .where(
            and(
              eq(healthcareRound.branch_id, branchId),
              eq(healthcareRound.resident_id, resident.id),
            ),
          )
          .orderBy(desc(healthcareRound.created_at))
          .limit(10),
      ]),
    );
    return {
      recentLogs: logs.map((row) => ({
        createdAt: row.created_at.toISOString(),
        id: row.id,
        note: row.note,
      })),
      recentRounds: rounds.map((row) => ({
        createdAt: row.created_at.toISOString(),
        findings: row.findings,
        id: row.id,
        ordersNote: row.orders_note,
      })),
      resident: {
        id: resident.id,
        name: resident.name,
        status: resident.status,
        uhid: resident.uhid,
      },
      scores: scores.map((row) => ({
        band: row.band,
        id: row.id,
        kind: row.kind,
        score: Number(row.score),
      })),
    };
  });
