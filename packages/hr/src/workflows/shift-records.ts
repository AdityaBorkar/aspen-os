import { shiftAssignment } from "#/db-schemas";
import type { Db } from "#/workflows/db";

// Single owner for shiftAssignment inserts: the assignment workflow action and
// the request-approval flow share these defaults instead of each inlining them.
export async function insertShiftAssignment(
  db: Db,
  input: {
    employeeId: string;
    endDate?: string;
    notes?: string;
    shiftLocation?: string;
    shiftType: string;
    startDate: string;
  },
) {
  const [result] = await db
    .insert(shiftAssignment)
    .values({
      employeeId: input.employeeId,
      endDate: input.endDate ?? null,
      notes: input.notes ?? null,
      shiftLocation: input.shiftLocation ?? null,
      shiftType: input.shiftType,
      startDate: input.startDate,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create shift assignment.");
  }

  return result;
}
