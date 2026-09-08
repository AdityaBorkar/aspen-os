import { hrSettings } from "#/db-schemas";
import { UpdateHrSettingsSchema } from "#/types";
import { fetchHrSettings } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const InputSchema = object({
  patch: UpdateHrSettingsSchema,
});

export const updateHrSettings = Workflow.name("hr.setup.update-hr-settings")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { patch } = input;

    const current = await fetchHrSettings(ctx.db);
    const parsed = patch;

    if (!current) {
      const [created] = await ctx.db
        .insert(hrSettings)
        .values({
          allow_multiple_shift_assignments: parsed.allowMultipleShiftAssignments ?? null,
          auto_attendance: parsed.autoAttendance ?? null,
          default_holiday_list: parsed.defaultHolidayList ?? null,
          employee_naming_series: parsed.employeeNamingSeries ?? null,
          expense_claim_default: parsed.expenseClaimDefault ?? null,
          geolocation_tracking: parsed.geolocationTracking ?? null,
          leave_approval_workflow: parsed.leaveApprovalWorkflow ?? null,
          leave_without_pay_handling: parsed.leaveWithoutPayHandling ?? null,
        })
        .returning();
      return created;
    }

    const [updated] = await ctx.db
      .update(hrSettings)
      .set({
        allow_multiple_shift_assignments: parsed.allowMultipleShiftAssignments,
        auto_attendance: parsed.autoAttendance,
        default_holiday_list: parsed.defaultHolidayList,
        employee_naming_series: parsed.employeeNamingSeries,
        expense_claim_default: parsed.expenseClaimDefault,
        geolocation_tracking: parsed.geolocationTracking,
        leave_approval_workflow: parsed.leaveApprovalWorkflow,
        leave_without_pay_handling: parsed.leaveWithoutPayHandling,
        updated_at: new Date(),
      })
      .where(eq(hrSettings.id, current.id))
      .returning();

    return updated;
  });
