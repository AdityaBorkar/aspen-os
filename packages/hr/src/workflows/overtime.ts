import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { overtimeSlip, overtimeType } from "../db-schema";
import type {
  CreateOvertimeSlipInput,
  CreateOvertimeTypeInput,
  OvertimeSlipFilters,
  OvertimeSummary,
  UpdateOvertimeSlipInput,
  UpdateOvertimeTypeInput,
} from "../types";
import {
  CreateOvertimeSlipSchema,
  CreateOvertimeTypeSchema,
  OvertimeSlipFiltersSchema,
  UpdateOvertimeSlipSchema,
  UpdateOvertimeTypeSchema,
} from "../types";

export class OvertimeWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Overtime Type ───────────────────────────────────────────────────────

  async createOvertimeType(input: CreateOvertimeTypeInput) {
    const parsed = parse(CreateOvertimeTypeSchema, input);

    const [result] = await this.db
      .insert(overtimeType)
      .values({
        amountCalculation: parsed.amountCalculation ?? "fixed",
        description: parsed.description ?? null,
        fixedHourlyRate: parsed.fixedHourlyRate ?? null,
        holidayMultiplier: parsed.holidayMultiplier ?? "2",
        maxOvertimeHoursPerDay: parsed.maxOvertimeHoursPerDay ?? null,
        name: parsed.name,
        overtimeSalaryComponent: parsed.overtimeSalaryComponent ?? null,
        standardMultiplier: parsed.standardMultiplier ?? "1.5",
        weekendMultiplier: parsed.weekendMultiplier ?? "2",
      })
      .returning();

    return result;
  }

  async updateOvertimeType(id: string, patch: UpdateOvertimeTypeInput) {
    const parsed = parse(UpdateOvertimeTypeSchema, patch);

    const [updated] = await this.db
      .update(overtimeType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(overtimeType.id, id))
      .returning();

    return updated;
  }

  async getOvertimeTypeById(id: string) {
    const [result] = await this.db
      .select()
      .from(overtimeType)
      .where(eq(overtimeType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Overtime type with id "${id}" not found.`);
    }

    return result;
  }

  async listOvertimeTypes() {
    return this.db.select().from(overtimeType);
  }

  async deleteOvertimeType(id: string) {
    const [updated] = await this.db
      .update(overtimeType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(overtimeType.id, id))
      .returning();

    return updated;
  }

  // ─── Overtime Slip ───────────────────────────────────────────────────────

  async createOvertimeSlip(input: CreateOvertimeSlipInput) {
    const parsed = parse(CreateOvertimeSlipSchema, input);

    // Verify overtime type exists
    await this.getOvertimeTypeById(parsed.overtimeType);

    const [result] = await this.db
      .insert(overtimeSlip)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        holidayHours: parsed.holidayHours ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        overtimeType: parsed.overtimeType,
        standardHours: parsed.standardHours ?? "0",
        toDate: parsed.toDate,
        totalOvertimeHours: parsed.totalOvertimeHours,
        weekendHours: parsed.weekendHours ?? "0",
      })
      .returning();

    return result;
  }

  async updateOvertimeSlip(id: string, patch: UpdateOvertimeSlipInput) {
    const parsed = parse(UpdateOvertimeSlipSchema, patch);

    const [updated] = await this.db
      .update(overtimeSlip)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return updated;
  }

  async getOvertimeSlipById(id: string) {
    const [result] = await this.db
      .select()
      .from(overtimeSlip)
      .where(eq(overtimeSlip.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Overtime slip with id "${id}" not found.`);
    }

    return result;
  }

  async listOvertimeSlips(filters?: OvertimeSlipFilters) {
    const parsed = filters ? parse(OvertimeSlipFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(overtimeSlip.employeeId, parsed.employeeId));
    }
    if (parsed.overtimeType) {
      conditions.push(eq(overtimeSlip.overtimeType, parsed.overtimeType));
    }
    if (parsed.status) {
      conditions.push(eq(overtimeSlip.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(overtimeSlip).where(whereClause);
  }

  async approveOvertimeSlip(id: string, approvedBy: string) {
    const slip = await this.getOvertimeSlipById(id);
    const overtimeTypeRecord = await this.getOvertimeTypeById(
      slip.overtimeType,
    );

    // Calculate amount
    let amount = 0;
    const standardHours = parseFloat(slip.standardHours);
    const holidayHours = parseFloat(slip.holidayHours);
    const weekendHours = parseFloat(slip.weekendHours);

    if (
      overtimeTypeRecord.amountCalculation === "fixed" &&
      overtimeTypeRecord.fixedHourlyRate
    ) {
      const hourlyRate = parseFloat(overtimeTypeRecord.fixedHourlyRate);
      const standardMultiplier = parseFloat(
        overtimeTypeRecord.standardMultiplier,
      );
      const holidayMultiplier = parseFloat(
        overtimeTypeRecord.holidayMultiplier,
      );
      const weekendMultiplier = parseFloat(
        overtimeTypeRecord.weekendMultiplier,
      );

      amount =
        standardHours * hourlyRate * standardMultiplier +
        holidayHours * hourlyRate * holidayMultiplier +
        weekendHours * hourlyRate * weekendMultiplier;
    }

    const [updated] = await this.db
      .update(overtimeSlip)
      .set({
        amount: amount.toString(),
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return updated;
  }

  async rejectOvertimeSlip(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(overtimeSlip)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return updated;
  }

  async getOvertimeSummary(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<OvertimeSummary> {
    const slips = await this.db
      .select()
      .from(overtimeSlip)
      .where(
        and(
          eq(overtimeSlip.employeeId, employeeId),
          eq(overtimeSlip.status, "approved"),
          sql`${overtimeSlip.fromDate} >= ${fromDate}`,
          sql`${overtimeSlip.toDate} <= ${toDate}`,
        ),
      );

    const summary: OvertimeSummary = {
      holidayHours: 0,
      standardHours: 0,
      totalHours: 0,
      weekendHours: 0,
    };

    for (const slip of slips) {
      summary.standardHours += parseFloat(slip.standardHours);
      summary.holidayHours += parseFloat(slip.holidayHours);
      summary.weekendHours += parseFloat(slip.weekendHours);
      summary.totalHours += parseFloat(slip.totalOvertimeHours);
    }

    return summary;
  }

  async deleteOvertimeSlip(id: string) {
    const [deleted] = await this.db
      .delete(overtimeSlip)
      .where(eq(overtimeSlip.id, id))
      .returning();

    return deleted;
  }
}
