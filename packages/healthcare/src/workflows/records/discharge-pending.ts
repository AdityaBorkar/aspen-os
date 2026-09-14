import { healthcareNursingTask, healthcareDaycareSitting } from "#/db-schemas/nursing";
import { TimelineQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DischargePendingInputSchema = object({ input: TimelineQuerySchema });

export const dischargePending = Workflow.name("healthcare.records.discharge-pending")
  .input(DischargePendingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TimelineQuerySchema, input);
    const branchId = parsed.branchId ?? "main";
    const [sittings, tasks] = await ctx.step.run("load-pending", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareDaycareSitting)
          .where(
            and(
              eq(healthcareDaycareSitting.branch_id, branchId),
              eq(healthcareDaycareSitting.patient_id, parsed.patientId),
            ),
          )
          .limit(100),
        ctx.db
          .select()
          .from(healthcareNursingTask)
          .where(
            and(
              eq(healthcareNursingTask.branch_id, branchId),
              eq(healthcareNursingTask.patient_id, parsed.patientId),
              eq(healthcareNursingTask.status, "open"),
            ),
          )
          .limit(100),
      ]),
    );
    const days = new Map<string, { post: boolean; pre: boolean }>();
    for (const sitting of sittings) {
      const day = sitting.created_at.toISOString().slice(0, 10);
      const entry = days.get(day) ?? { post: false, pre: false };
      if (sitting.phase === "pre") {
        entry.pre = true;
      } else {
        entry.post = true;
      }
      days.set(day, entry);
    }
    const pendingDays = [...days.entries()]
      .filter(([, entry]) => entry.pre && !entry.post)
      .map(([day]) => day);
    return {
      openTasks: tasks.map((row) => ({ id: row.id, kind: row.kind, title: row.title })),
      patientId: parsed.patientId,
      pendingDays,
    };
  });
