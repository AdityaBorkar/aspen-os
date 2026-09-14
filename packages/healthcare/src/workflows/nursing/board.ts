import { healthcareNursingTask } from "#/db-schemas/nursing";
import { NursingBoardSchema } from "#/schemas/nursing";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const NursingBoardInputSchema = object({ input: NursingBoardSchema });

export const board = Workflow.name("healthcare.nursing.board")
  .input(NursingBoardInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(NursingBoardSchema, input);
    const rows = await ctx.step.run("load-board", async () =>
      ctx.db
        .select()
        .from(healthcareNursingTask)
        .where(eq(healthcareNursingTask.branch_id, parsed.branchId ?? "main"))
        .limit(500),
    );
    const now = Date.now();
    const open = rows.filter((row) => row.status === "open");
    const overdue = open.filter((row) => row.due_at && row.due_at.getTime() < now);
    const red = open.filter((row) => row.kind === "critical");
    const toDto = (row: (typeof rows)[number]) => ({
      dueAt: row.due_at?.toISOString() ?? null,
      id: row.id,
      kind: row.kind,
      patientId: row.patient_id,
      status: row.status,
      title: row.title,
    });
    return {
      amber: overdue.map(toDto),
      open: open.map(toDto),
      overdueCount: overdue.length,
      red: red.map(toDto),
    };
  });
