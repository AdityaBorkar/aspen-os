import { healthcareNursingTask } from "#/db-schemas/nursing";
import { NursingBoardSchema } from "#/schemas/nursing";
import { NURSING_OPEN_STATUS, boardBranchOf, boardLimitOf } from "#/workflows/shared/board-query";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const NursingBoardInputSchema = object({ input: NursingBoardSchema });

function toDto(row: {
  due_at: Date | null;
  id: string;
  kind: string;
  patient_id: string;
  status: string;
  title: string;
}) {
  return {
    dueAt: row.due_at?.toISOString() ?? null,
    id: row.id,
    kind: row.kind,
    patientId: row.patient_id,
    status: row.status,
    title: row.title,
  };
}

export const board = Workflow.name("healthcare.nursing.board")
  .input(NursingBoardInputSchema)
  .handler(async ({ input }, ctx) => {
    // Nursing board is a clinical read view over healthcare_nursing_task
    // filtered by patient/encounter, keeping amber/red triage display
    // (literals in shared/board-query.ts). Order fulfilment itself lives in
    // tasks.task via the tasks.healthcare-bridge; this view never owns
    // status/automation.
    const parsed = parse(NursingBoardSchema, input);
    const rows = await ctx.step.run("load-board", async () =>
      ctx.db
        .select()
        .from(healthcareNursingTask)
        .where(eq(healthcareNursingTask.branch_id, boardBranchOf(parsed.branchId)))
        .limit(boardLimitOf(undefined, 500, 500)),
    );
    const now = Date.now();
    const open = rows.filter((row) => row.status === NURSING_OPEN_STATUS);
    const overdue = open.filter((row) => row.due_at && row.due_at.getTime() < now);
    const red = open.filter((row) => row.kind === "critical");
    return {
      amber: overdue.map(toDto),
      open: open.map(toDto),
      overdueCount: overdue.length,
      red: red.map(toDto),
    };
  });
