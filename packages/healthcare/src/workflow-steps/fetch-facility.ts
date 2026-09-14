import type { healthcareFacilityBlock, healthcareSterilizationLog } from "#/db-schemas/facilities";
import { healthcareFacility } from "#/db-schemas/facilities";
import { WithIdSchema } from "#/schemas";

import type { JsonValue } from "@aspen-os/platform/server";
import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, object, string } from "valibot";

export const fetchFacilityStep = WorkflowStep.name("healthcare-fetch-facility")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareFacility)
      .where(eq(healthcareFacility.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Facility "${input.id}" not found.`);
    }
    return row;
  });

export interface FacilityScheduleEntry {
  close: string;
  open: string;
  weekday: string;
  [key: string]: JsonValue;
}

const FacilityScheduleEntrySchema = object({
  close: string(),
  open: string(),
  weekday: string(),
});

export function readFacilitySchedules(payload: Record<string, JsonValue>): FacilityScheduleEntry[] {
  const raw = payload.schedules;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry: JsonValue): entry is FacilityScheduleEntry =>
      is(FacilityScheduleEntrySchema, entry),
    )
    .map((entry) => ({
      close: entry.close ?? "",
      open: entry.open ?? "",
      weekday: entry.weekday ?? "",
    }));
}

export interface FacilityDto {
  branchId: string;
  category: string;
  code: string | null;
  createdAt: string;
  id: string;
  name: string;
  occupiedAt: string | null;
  occupiedNote: string | null;
  schedules: FacilityScheduleEntry[];
  status: string;
  updatedAt: string;
}

export function toFacilityDto(row: typeof healthcareFacility.$inferSelect): FacilityDto {
  return {
    branchId: row.branch_id,
    category: row.category,
    code: row.code,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    name: row.name,
    occupiedAt: row.occupied_at ? row.occupied_at.toISOString() : null,
    occupiedNote: row.occupied_note,
    schedules: readFacilitySchedules(row.payload),
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface FacilityBlockDto {
  branchId: string;
  createdAt: string;
  facilityId: string;
  from: string;
  id: string;
  reason: string | null;
  to: string;
  updatedAt: string;
}

export function toFacilityBlockDto(
  row: typeof healthcareFacilityBlock.$inferSelect,
): FacilityBlockDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    facilityId: row.facility_id,
    from: row.from_at.toISOString(),
    id: row.id,
    reason: row.reason,
    to: row.to_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface SterilizationLogDto {
  at: string;
  branchId: string;
  by: string | null;
  createdAt: string;
  facilityId: string;
  id: string;
  item: string;
  method: string;
  updatedAt: string;
}

export function toSterilizationLogDto(
  row: typeof healthcareSterilizationLog.$inferSelect,
): SterilizationLogDto {
  return {
    at: row.at.toISOString(),
    branchId: row.branch_id,
    by: row.by,
    createdAt: row.created_at.toISOString(),
    facilityId: row.facility_id,
    id: row.id,
    item: row.item,
    method: row.method,
    updatedAt: row.updated_at.toISOString(),
  };
}
