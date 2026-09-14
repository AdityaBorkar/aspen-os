import { healthcareRehabSitting } from "#/db-schemas/rehab";
import { RehabFiltersSchema } from "#/schemas/rehab";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DayBoardInputSchema = object({ input: RehabFiltersSchema });

export const dayBoard = Workflow.name("healthcare.rehab.dayBoard")
  .input(DayBoardInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RehabFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("list-rehab-sittings", async () => {
      const conditions = [eq(healthcareRehabSitting.branch_id, branchId)];
      if (parsed.episodeId) {
        conditions.push(eq(healthcareRehabSitting.episode_id, parsed.episodeId));
      }
      if (parsed.patientId) {
        conditions.push(eq(healthcareRehabSitting.patient_id, parsed.patientId));
      }
      return ctx.db
        .select()
        .from(healthcareRehabSitting)
        .where(and(...conditions))
        .orderBy(desc(healthcareRehabSitting.created_at))
        .limit(parsed.limit ?? 100)
        .offset(parsed.offset ?? 0);
    });

    return rows.map((row) => ({
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      episodeId: row.episode_id,
      id: row.id,
      modality: row.modality,
      patientId: row.patient_id,
      slot: row.slot,
      status: row.status,
    }));
  });
