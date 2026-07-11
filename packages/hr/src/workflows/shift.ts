import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} from "../db-schema";
import type {
  CreateShiftAssignmentInput,
  CreateShiftLocationInput,
  CreateShiftRequestInput,
  CreateShiftScheduleAssignmentInput,
  CreateShiftScheduleInput,
  CreateShiftTypeInput,
  ShiftAssignmentFilters,
  ShiftRequestFilters,
  UpdateShiftAssignmentInput,
  UpdateShiftLocationInput,
  UpdateShiftRequestInput,
  UpdateShiftScheduleAssignmentInput,
  UpdateShiftScheduleInput,
  UpdateShiftTypeInput,
} from "../types";
import {
  CreateShiftAssignmentSchema,
  CreateShiftLocationSchema,
  CreateShiftRequestSchema,
  CreateShiftScheduleAssignmentSchema,
  CreateShiftScheduleSchema,
  CreateShiftTypeSchema,
  ShiftAssignmentFiltersSchema,
  ShiftRequestFiltersSchema,
  UpdateShiftAssignmentSchema,
  UpdateShiftLocationSchema,
  UpdateShiftRequestSchema,
  UpdateShiftScheduleAssignmentSchema,
  UpdateShiftScheduleSchema,
  UpdateShiftTypeSchema,
} from "../types";

export class ShiftWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Shift Type ──────────────────────────────────────────────────────────

  async createShiftType(input: CreateShiftTypeInput) {
    const parsed = parse(CreateShiftTypeSchema, input);

    const [result] = await this.db
      .insert(shiftType)
      .values({
        allowCheckOutAfterEnd: parsed.allowCheckOutAfterEnd ?? 0,
        allowOvertime: parsed.allowOvertime ?? false,
        beginCheckInBeforeStart: parsed.beginCheckInBeforeStart ?? 0,
        determineCheckInBy: parsed.determineCheckInBy ?? null,
        earlyExitGraceMinutes: parsed.earlyExitGraceMinutes ?? 0,
        enableAutoAttendance: parsed.enableAutoAttendance ?? false,
        enableAutoUpdateSync: parsed.enableAutoUpdateSync ?? false,
        endTime: parsed.endTime,
        holidayList: parsed.holidayList ?? null,
        lateEntryGraceMinutes: parsed.lateEntryGraceMinutes ?? 0,
        markAttendanceOnHolidays: parsed.markAttendanceOnHolidays ?? false,
        name: parsed.name,
        overtimeType: parsed.overtimeType ?? null,
        processAttendanceAfter: parsed.processAttendanceAfter ?? null,
        startTime: parsed.startTime,
        workingHoursCalculation: parsed.workingHoursCalculation ?? null,
        workingHoursThresholdForAbsent:
          parsed.workingHoursThresholdForAbsent ?? null,
        workingHoursThresholdForHalfDay:
          parsed.workingHoursThresholdForHalfDay ?? null,
      })
      .returning();

    return result;
  }

  async updateShiftType(id: string, patch: UpdateShiftTypeInput) {
    const parsed = parse(UpdateShiftTypeSchema, patch);

    const [updated] = await this.db
      .update(shiftType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftType.id, id))
      .returning();

    return updated;
  }

  async getShiftTypeById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftType)
      .where(eq(shiftType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift type with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftTypes() {
    return this.db.select().from(shiftType);
  }

  async deleteShiftType(id: string) {
    const [updated] = await this.db
      .update(shiftType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shiftType.id, id))
      .returning();

    return updated;
  }

  // ─── Shift Location ──────────────────────────────────────────────────────

  async createShiftLocation(input: CreateShiftLocationInput) {
    const parsed = parse(CreateShiftLocationSchema, input);

    const [result] = await this.db
      .insert(shiftLocation)
      .values({
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        name: parsed.name,
        radius: parsed.radius ?? 500,
      })
      .returning();

    return result;
  }

  async updateShiftLocation(id: string, patch: UpdateShiftLocationInput) {
    const parsed = parse(UpdateShiftLocationSchema, patch);

    const [updated] = await this.db
      .update(shiftLocation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftLocation.id, id))
      .returning();

    return updated;
  }

  async getShiftLocationById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftLocation)
      .where(eq(shiftLocation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift location with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftLocations() {
    return this.db.select().from(shiftLocation);
  }

  async deleteShiftLocation(id: string) {
    const [updated] = await this.db
      .update(shiftLocation)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shiftLocation.id, id))
      .returning();

    return updated;
  }

  // ─── Shift Assignment ────────────────────────────────────────────────────

  async createShiftAssignment(input: CreateShiftAssignmentInput) {
    const parsed = parse(CreateShiftAssignmentSchema, input);

    // Verify shift type exists
    await this.getShiftTypeById(parsed.shiftType);

    const [result] = await this.db
      .insert(shiftAssignment)
      .values({
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        notes: parsed.notes ?? null,
        shiftLocation: parsed.shiftLocation ?? null,
        shiftType: parsed.shiftType,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  }

  async updateShiftAssignment(id: string, patch: UpdateShiftAssignmentInput) {
    const parsed = parse(UpdateShiftAssignmentSchema, patch);

    const [updated] = await this.db
      .update(shiftAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftAssignment.id, id))
      .returning();

    return updated;
  }

  async getShiftAssignmentById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftAssignment)
      .where(eq(shiftAssignment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift assignment with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftAssignments(filters?: ShiftAssignmentFilters) {
    const parsed = filters ? parse(ShiftAssignmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(shiftAssignment.employeeId, parsed.employeeId));
    }
    if (parsed.shiftType) {
      conditions.push(eq(shiftAssignment.shiftType, parsed.shiftType));
    }
    if (parsed.status) {
      conditions.push(eq(shiftAssignment.status, parsed.status));
    }
    if (parsed.startDate) {
      conditions.push(sql`${shiftAssignment.startDate} >= ${parsed.startDate}`);
    }
    if (parsed.endDate) {
      conditions.push(sql`${shiftAssignment.endDate} <= ${parsed.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(shiftAssignment).where(whereClause);
  }

  async deactivateShiftAssignment(id: string) {
    const [updated] = await this.db
      .update(shiftAssignment)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(shiftAssignment.id, id))
      .returning();

    return updated;
  }

  async deleteShiftAssignment(id: string) {
    const [deleted] = await this.db
      .delete(shiftAssignment)
      .where(eq(shiftAssignment.id, id))
      .returning();

    return deleted;
  }

  // ─── Shift Request ───────────────────────────────────────────────────────

  async createShiftRequest(input: CreateShiftRequestInput) {
    const parsed = parse(CreateShiftRequestSchema, input);

    // Verify shift type exists
    await this.getShiftTypeById(parsed.shiftType);

    const [result] = await this.db
      .insert(shiftRequest)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        reason: parsed.reason ?? null,
        shiftType: parsed.shiftType,
        toDate: parsed.toDate ?? null,
      })
      .returning();

    return result;
  }

  async updateShiftRequest(id: string, patch: UpdateShiftRequestInput) {
    const parsed = parse(UpdateShiftRequestSchema, patch);

    const [updated] = await this.db
      .update(shiftRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftRequest.id, id))
      .returning();

    return updated;
  }

  async getShiftRequestById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftRequest)
      .where(eq(shiftRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift request with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftRequests(filters?: ShiftRequestFilters) {
    const parsed = filters ? parse(ShiftRequestFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(shiftRequest.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(shiftRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(shiftRequest).where(whereClause);
  }

  async approveShiftRequest(id: string, approvedBy: string) {
    const request = await this.getShiftRequestById(id);

    // Create shift assignment
    const assignment = await this.createShiftAssignment({
      employeeId: request.employeeId,
      endDate: request.toDate ?? undefined,
      shiftType: request.shiftType,
      startDate: request.fromDate,
    });

    if (!assignment) {
      throw new Error("Failed to create shift assignment.");
    }

    // Update request status
    const [updated] = await this.db
      .update(shiftRequest)
      .set({
        approvedAt: new Date(),
        approvedBy,
        shiftAssignment: assignment.id,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(shiftRequest.id, id))
      .returning();

    return updated;
  }

  async rejectShiftRequest(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(shiftRequest)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(shiftRequest.id, id))
      .returning();

    return updated;
  }

  async deleteShiftRequest(id: string) {
    const [deleted] = await this.db
      .delete(shiftRequest)
      .where(eq(shiftRequest.id, id))
      .returning();

    return deleted;
  }

  // ─── Shift Schedule ──────────────────────────────────────────────────────

  async createShiftSchedule(input: CreateShiftScheduleInput) {
    const parsed = parse(CreateShiftScheduleSchema, input);

    // Verify shift type exists
    await this.getShiftTypeById(parsed.shiftType);

    const [result] = await this.db
      .insert(shiftSchedule)
      .values({
        friday: parsed.friday ?? false,
        monday: parsed.monday ?? false,
        name: parsed.name,
        saturday: parsed.saturday ?? false,
        shiftType: parsed.shiftType,
        sunday: parsed.sunday ?? false,
        thursday: parsed.thursday ?? false,
        tuesday: parsed.tuesday ?? false,
        wednesday: parsed.wednesday ?? false,
      })
      .returning();

    return result;
  }

  async updateShiftSchedule(id: string, patch: UpdateShiftScheduleInput) {
    const parsed = parse(UpdateShiftScheduleSchema, patch);

    const [updated] = await this.db
      .update(shiftSchedule)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftSchedule.id, id))
      .returning();

    return updated;
  }

  async getShiftScheduleById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftSchedule)
      .where(eq(shiftSchedule.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift schedule with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftSchedules() {
    return this.db.select().from(shiftSchedule);
  }

  async deleteShiftSchedule(id: string) {
    const [deleted] = await this.db
      .delete(shiftSchedule)
      .where(eq(shiftSchedule.id, id))
      .returning();

    return deleted;
  }

  // ─── Shift Schedule Assignment ───────────────────────────────────────────

  async createShiftScheduleAssignment(
    input: CreateShiftScheduleAssignmentInput,
  ) {
    const parsed = parse(CreateShiftScheduleAssignmentSchema, input);

    // Verify shift schedule exists
    await this.getShiftScheduleById(parsed.shiftSchedule);

    const [result] = await this.db
      .insert(shiftScheduleAssignment)
      .values({
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        isActive: parsed.isActive ?? true,
        shiftSchedule: parsed.shiftSchedule,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  }

  async updateShiftScheduleAssignment(
    id: string,
    patch: UpdateShiftScheduleAssignmentInput,
  ) {
    const parsed = parse(UpdateShiftScheduleAssignmentSchema, patch);

    const [updated] = await this.db
      .update(shiftScheduleAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftScheduleAssignment.id, id))
      .returning();

    return updated;
  }

  async getShiftScheduleAssignmentById(id: string) {
    const [result] = await this.db
      .select()
      .from(shiftScheduleAssignment)
      .where(eq(shiftScheduleAssignment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift schedule assignment with id "${id}" not found.`);
    }

    return result;
  }

  async listShiftScheduleAssignments(employeeId?: string) {
    const conditions = [];
    if (employeeId) {
      conditions.push(eq(shiftScheduleAssignment.employeeId, employeeId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(shiftScheduleAssignment).where(whereClause);
  }

  async deleteShiftScheduleAssignment(id: string) {
    const [deleted] = await this.db
      .delete(shiftScheduleAssignment)
      .where(eq(shiftScheduleAssignment.id, id))
      .returning();

    return deleted;
  }
}
