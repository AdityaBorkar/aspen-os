import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { attendance, attendanceRequest, employeeCheckin } from "../db-schema";
import type {
  AttendanceFilters,
  AttendanceRequestFilters,
  AttendanceSummary,
  CheckinFilters,
  CreateAttendanceInput,
  CreateAttendanceRequestInput,
  CreateCheckinInput,
  UpdateAttendanceInput,
  UpdateAttendanceRequestInput,
} from "../types";
import {
  AttendanceFiltersSchema,
  AttendanceRequestFiltersSchema,
  CheckinFiltersSchema,
  CreateAttendanceRequestSchema,
  CreateAttendanceSchema,
  CreateCheckinSchema,
  UpdateAttendanceRequestSchema,
  UpdateAttendanceSchema,
} from "../types";

export class AttendanceWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Attendance ──────────────────────────────────────────────────────────

  async create(input: CreateAttendanceInput) {
    const parsed = parse(CreateAttendanceSchema, input);

    // Check for future dates
    const attendanceDate = new Date(parsed.date);
    if (attendanceDate > new Date()) {
      throw new Error("Cannot mark attendance for future dates.");
    }

    // Check for duplicate attendance
    await this.ensureNoDuplicateAttendance(parsed.employeeId, parsed.date);

    const [result] = await this.db
      .insert(attendance)
      .values({
        attendanceRequest: parsed.attendanceRequest ?? null,
        checkInTime: parsed.checkInTime ? new Date(parsed.checkInTime) : null,
        checkOutTime: parsed.checkOutTime
          ? new Date(parsed.checkOutTime)
          : null,
        date: parsed.date,
        earlyExit: parsed.earlyExit ?? false,
        earlyExitMinutes: parsed.earlyExitMinutes ?? 0,
        employeeId: parsed.employeeId,
        halfDayType: parsed.halfDayType ?? null,
        isHalfDay: parsed.isHalfDay ?? false,
        lateEntry: parsed.lateEntry ?? false,
        lateEntryMinutes: parsed.lateEntryMinutes ?? 0,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        shift: parsed.shift ?? null,
        status: parsed.status,
        workingHours: parsed.workingHours ?? null,
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateAttendanceInput) {
    const parsed = parse(UpdateAttendanceSchema, patch);

    const [updated] = await this.db
      .update(attendance)
      .set({
        ...parsed,
        checkInTime: parsed.checkInTime
          ? new Date(parsed.checkInTime)
          : undefined,
        checkOutTime: parsed.checkOutTime
          ? new Date(parsed.checkOutTime)
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, id))
      .returning();

    return updated;
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Attendance with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: AttendanceFilters) {
    const parsed = filters ? parse(AttendanceFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(attendance.employeeId, parsed.employeeId));
    }
    if (parsed.date) {
      conditions.push(eq(attendance.date, parsed.date));
    }
    if (parsed.startDate) {
      conditions.push(sql`${attendance.date} >= ${parsed.startDate}`);
    }
    if (parsed.endDate) {
      conditions.push(sql`${attendance.date} <= ${parsed.endDate}`);
    }
    if (parsed.status) {
      conditions.push(eq(attendance.status, parsed.status));
    }
    if (parsed.shift) {
      conditions.push(eq(attendance.shift, parsed.shift));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(attendance).where(whereClause);
  }

  async getSummary(
    employeeId: string,
    month: string,
  ): Promise<AttendanceSummary> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const records = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          sql`${attendance.date} >= ${startDate}`,
          sql`${attendance.date} <= ${endDate}`,
        ),
      );

    const summary: AttendanceSummary = {
      absent: 0,
      halfDay: 0,
      month,
      present: 0,
      totalDays: records.length,
      workFromHome: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case "present":
          summary.present++;
          break;
        case "absent":
          summary.absent++;
          break;
        case "half_day":
          summary.halfDay++;
          break;
        case "work_from_home":
          summary.workFromHome++;
          break;
      }
    }

    return summary;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(attendance)
      .where(eq(attendance.id, id))
      .returning();

    return deleted;
  }

  private async ensureNoDuplicateAttendance(
    employeeId: string,
    date: string,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(eq(attendance.employeeId, employeeId), eq(attendance.date, date)),
      )
      .limit(1);

    if (existing) {
      throw new Error(
        `Attendance already exists for employee "${employeeId}" on date "${date}".`,
      );
    }
  }

  // ─── Employee Checkin ────────────────────────────────────────────────────

  async createCheckin(input: CreateCheckinInput) {
    const parsed = parse(CreateCheckinSchema, input);

    const [result] = await this.db
      .insert(employeeCheckin)
      .values({
        deviceId: parsed.deviceId ?? null,
        employeeId: parsed.employeeId,
        isOffShift: parsed.isOffShift ?? false,
        latitude: parsed.latitude ?? null,
        logType: parsed.logType,
        longitude: parsed.longitude ?? null,
        metadata: parsed.metadata ?? null,
        shift: parsed.shift ?? null,
        time: new Date(parsed.time),
      })
      .returning();

    return result;
  }

  async getCheckinById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeCheckin)
      .where(eq(employeeCheckin.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Checkin with id "${id}" not found.`);
    }

    return result;
  }

  async listCheckins(filters?: CheckinFilters) {
    const parsed = filters ? parse(CheckinFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeCheckin.employeeId, parsed.employeeId));
    }
    if (parsed.logType) {
      conditions.push(eq(employeeCheckin.logType, parsed.logType));
    }
    if (parsed.shift) {
      conditions.push(eq(employeeCheckin.shift, parsed.shift));
    }
    if (parsed.deviceId) {
      conditions.push(eq(employeeCheckin.deviceId, parsed.deviceId));
    }
    if (parsed.isOffShift !== undefined) {
      conditions.push(eq(employeeCheckin.isOffShift, parsed.isOffShift));
    }
    if (parsed.startDate) {
      conditions.push(
        sql`${employeeCheckin.time} >= ${new Date(parsed.startDate)}`,
      );
    }
    if (parsed.endDate) {
      conditions.push(
        sql`${employeeCheckin.time} <= ${new Date(parsed.endDate)}`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employeeCheckin).where(whereClause);
  }

  async deleteCheckin(id: string) {
    const [deleted] = await this.db
      .delete(employeeCheckin)
      .where(eq(employeeCheckin.id, id))
      .returning();

    return deleted;
  }

  // ─── Attendance Request ──────────────────────────────────────────────────

  async createAttendanceRequest(input: CreateAttendanceRequestInput) {
    const parsed = parse(CreateAttendanceRequestSchema, input);

    const [result] = await this.db
      .insert(attendanceRequest)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        reason: parsed.reason,
        toDate: parsed.toDate,
      })
      .returning();

    return result;
  }

  async updateAttendanceRequest(
    id: string,
    patch: UpdateAttendanceRequestInput,
  ) {
    const parsed = parse(UpdateAttendanceRequestSchema, patch);

    const [updated] = await this.db
      .update(attendanceRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(attendanceRequest.id, id))
      .returning();

    return updated;
  }

  async getAttendanceRequestById(id: string) {
    const [result] = await this.db
      .select()
      .from(attendanceRequest)
      .where(eq(attendanceRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Attendance request with id "${id}" not found.`);
    }

    return result;
  }

  async listAttendanceRequests(filters?: AttendanceRequestFilters) {
    const parsed = filters
      ? parse(AttendanceRequestFiltersSchema, filters)
      : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(attendanceRequest.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(attendanceRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(attendanceRequest).where(whereClause);
  }

  async approveAttendanceRequest(id: string, approvedBy: string) {
    const [updated] = await this.db
      .update(attendanceRequest)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(attendanceRequest.id, id))
      .returning();

    return updated;
  }

  async rejectAttendanceRequest(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(attendanceRequest)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(attendanceRequest.id, id))
      .returning();

    return updated;
  }

  async deleteAttendanceRequest(id: string) {
    const [deleted] = await this.db
      .delete(attendanceRequest)
      .where(eq(attendanceRequest.id, id))
      .returning();

    return deleted;
  }
}
