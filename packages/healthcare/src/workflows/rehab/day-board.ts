import { healthcareRehabSitting } from "#/db-schemas/rehab";
import { RehabFiltersSchema } from "#/schemas/rehab";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

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

    const sittings = rows.map((row) => {
      const { payload } = row;
      return {
        branchId: row.branch_id,
        createdAt: row.created_at.toISOString(),
        date: row.date,
        episodeId: row.episode_id,
        equipmentId: is(string(), payload.equipmentId) ? payload.equipmentId : null,
        id: row.id,
        modality: row.modality,
        patientId: row.patient_id,
        slot: row.slot,
        status: row.status,
        therapistId: is(string(), payload.therapistId) ? payload.therapistId : null,
      };
    });
    const count = (status: string) =>
      sittings.filter((sitting) => sitting.status === status).length;
    const load: Record<string, number> = {};
    for (const sitting of sittings) {
      if (sitting.therapistId) {
        load[sitting.therapistId] = (load[sitting.therapistId] ?? 0) + 1;
      }
    }
    return {
      groups: {
        booked: count("Booked"),
        completed: count("Completed"),
        inProgress: count("InProgress"),
      },
      load,
      sittings,
      total: sittings.length,
    };
  });
