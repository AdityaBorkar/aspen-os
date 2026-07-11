import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  compensatoryLeaveRequest,
  leaveAdjustment,
  leaveAllocation,
  leaveApplication,
  leaveBlockList,
  leaveEncashment,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leavePolicyDetail,
  leaveType,
} from "../db-schema";
import type {
  CompensatoryLeaveFilters,
  CreateCompensatoryLeaveInput,
  CreateLeaveAdjustmentInput,
  CreateLeaveAllocationInput,
  CreateLeaveApplicationInput,
  CreateLeaveBlockListInput,
  CreateLeaveEncashmentInput,
  CreateLeavePeriodInput,
  CreateLeavePolicyAssignmentInput,
  CreateLeavePolicyDetailInput,
  CreateLeavePolicyInput,
  CreateLeaveTypeInput,
  LeaveAllocationFilters,
  LeaveApplicationFilters,
  LeaveBalance,
  LeaveBlockListFilters,
  LeaveEncashmentFilters,
  LeavePolicyAssignmentFilters,
  UpdateCompensatoryLeaveInput,
  UpdateLeaveAllocationInput,
  UpdateLeaveApplicationInput,
  UpdateLeaveBlockListInput,
  UpdateLeaveEncashmentInput,
  UpdateLeavePeriodInput,
  UpdateLeavePolicyAssignmentInput,
  UpdateLeavePolicyInput,
  UpdateLeaveTypeInput,
} from "../types";
import {
  CompensatoryLeaveFiltersSchema,
  CreateCompensatoryLeaveSchema,
  CreateLeaveAdjustmentSchema,
  CreateLeaveAllocationSchema,
  CreateLeaveApplicationSchema,
  CreateLeaveBlockListSchema,
  CreateLeaveEncashmentSchema,
  CreateLeavePeriodSchema,
  CreateLeavePolicyAssignmentSchema,
  CreateLeavePolicyDetailSchema,
  CreateLeavePolicySchema,
  CreateLeaveTypeSchema,
  LeaveAllocationFiltersSchema,
  LeaveApplicationFiltersSchema,
  LeaveBlockListFiltersSchema,
  LeaveEncashmentFiltersSchema,
  LeavePolicyAssignmentFiltersSchema,
  UpdateCompensatoryLeaveSchema,
  UpdateLeaveAllocationSchema,
  UpdateLeaveApplicationSchema,
  UpdateLeaveBlockListSchema,
  UpdateLeaveEncashmentSchema,
  UpdateLeavePeriodSchema,
  UpdateLeavePolicyAssignmentSchema,
  UpdateLeavePolicySchema,
  UpdateLeaveTypeSchema,
} from "../types";

export class LeaveWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Leave Type ──────────────────────────────────────────────────────────

  async createLeaveType(input: CreateLeaveTypeInput) {
    const parsed = parse(CreateLeaveTypeSchema, input);

    const [result] = await this.db
      .insert(leaveType)
      .values({
        allowNegativeBalance: parsed.allowNegativeBalance ?? false,
        applicableAfterWorkingDays: parsed.applicableAfterWorkingDays ?? 0,
        earnedLeaveFrequency: parsed.earnedLeaveFrequency ?? null,
        includeHolidaysWithinLeaves:
          parsed.includeHolidaysWithinLeaves ?? false,
        isCarryForward: parsed.isCarryForward ?? false,
        isEarnedLeave: parsed.isEarnedLeave ?? false,
        isLeaveWithoutPay: parsed.isLeaveWithoutPay ?? false,
        isPartiallyPaid: parsed.isPartiallyPaid ?? false,
        maxCarryForwardDays: parsed.maxCarryForwardDays ?? null,
        maxContinuousDaysAllowed: parsed.maxContinuousDaysAllowed ?? null,
        maxDaysAllowed: parsed.maxDaysAllowed,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateLeaveType(id: string, patch: UpdateLeaveTypeInput) {
    const parsed = parse(UpdateLeaveTypeSchema, patch);

    const [updated] = await this.db
      .update(leaveType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveType.id, id))
      .returning();

    return updated;
  }

  async getLeaveTypeById(id: string) {
    const [result] = await this.db
      .select()
      .from(leaveType)
      .where(eq(leaveType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave type with id "${id}" not found.`);
    }

    return result;
  }

  async listLeaveTypes() {
    return this.db.select().from(leaveType);
  }

  async deleteLeaveType(id: string) {
    const [updated] = await this.db
      .update(leaveType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(leaveType.id, id))
      .returning();

    return updated;
  }

  // ─── Leave Period ────────────────────────────────────────────────────────

  async createLeavePeriod(input: CreateLeavePeriodInput) {
    const parsed = parse(CreateLeavePeriodSchema, input);

    const [result] = await this.db
      .insert(leavePeriod)
      .values({
        company: parsed.company ?? null,
        endDate: parsed.endDate,
        name: parsed.name,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  }

  async updateLeavePeriod(id: string, patch: UpdateLeavePeriodInput) {
    const parsed = parse(UpdateLeavePeriodSchema, patch);

    const [updated] = await this.db
      .update(leavePeriod)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePeriod.id, id))
      .returning();

    return updated;
  }

  async getLeavePeriodById(id: string) {
    const [result] = await this.db
      .select()
      .from(leavePeriod)
      .where(eq(leavePeriod.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave period with id "${id}" not found.`);
    }

    return result;
  }

  async listLeavePeriods() {
    return this.db.select().from(leavePeriod);
  }

  async deleteLeavePeriod(id: string) {
    const [updated] = await this.db
      .update(leavePeriod)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(leavePeriod.id, id))
      .returning();

    return updated;
  }

  // ─── Leave Policy ────────────────────────────────────────────────────────

  async createLeavePolicy(input: CreateLeavePolicyInput) {
    const parsed = parse(CreateLeavePolicySchema, input);

    const [result] = await this.db
      .insert(leavePolicy)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateLeavePolicy(id: string, patch: UpdateLeavePolicyInput) {
    const parsed = parse(UpdateLeavePolicySchema, patch);

    const [updated] = await this.db
      .update(leavePolicy)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePolicy.id, id))
      .returning();

    return updated;
  }

  async getLeavePolicyById(id: string) {
    const [result] = await this.db
      .select()
      .from(leavePolicy)
      .where(eq(leavePolicy.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave policy with id "${id}" not found.`);
    }

    return result;
  }

  async listLeavePolicies() {
    return this.db.select().from(leavePolicy);
  }

  async deleteLeavePolicy(id: string) {
    // Delete policy details first
    await this.db
      .delete(leavePolicyDetail)
      .where(eq(leavePolicyDetail.leavePolicyId, id));

    const [deleted] = await this.db
      .delete(leavePolicy)
      .where(eq(leavePolicy.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Policy Detail ─────────────────────────────────────────────────

  async createLeavePolicyDetail(input: CreateLeavePolicyDetailInput) {
    const parsed = parse(CreateLeavePolicyDetailSchema, input);

    // Verify leave policy exists
    await this.getLeavePolicyById(parsed.leavePolicyId);

    // Verify leave type exists
    await this.getLeaveTypeById(parsed.leaveType);

    const [result] = await this.db
      .insert(leavePolicyDetail)
      .values({
        carryForwardDays: parsed.carryForwardDays ?? 0,
        leavePolicyId: parsed.leavePolicyId,
        leaveType: parsed.leaveType,
        maxDays: parsed.maxDays,
      })
      .returning();

    return result;
  }

  async listLeavePolicyDetails(leavePolicyId: string) {
    return this.db
      .select()
      .from(leavePolicyDetail)
      .where(eq(leavePolicyDetail.leavePolicyId, leavePolicyId));
  }

  async deleteLeavePolicyDetail(id: string) {
    const [deleted] = await this.db
      .delete(leavePolicyDetail)
      .where(eq(leavePolicyDetail.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Policy Assignment ─────────────────────────────────────────────

  async createLeavePolicyAssignment(input: CreateLeavePolicyAssignmentInput) {
    const parsed = parse(CreateLeavePolicyAssignmentSchema, input);

    // Verify leave policy exists
    await this.getLeavePolicyById(parsed.leavePolicy);

    // Verify leave period exists
    await this.getLeavePeriodById(parsed.leavePeriod);

    const [result] = await this.db
      .insert(leavePolicyAssignment)
      .values({
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        employeeId: parsed.employeeId,
        leavePeriod: parsed.leavePeriod,
        leavePolicy: parsed.leavePolicy,
      })
      .returning();

    return result;
  }

  async updateLeavePolicyAssignment(
    id: string,
    patch: UpdateLeavePolicyAssignmentInput,
  ) {
    const parsed = parse(UpdateLeavePolicyAssignmentSchema, patch);

    const [updated] = await this.db
      .update(leavePolicyAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePolicyAssignment.id, id))
      .returning();

    return updated;
  }

  async getLeavePolicyAssignmentById(id: string) {
    const [result] = await this.db
      .select()
      .from(leavePolicyAssignment)
      .where(eq(leavePolicyAssignment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave policy assignment with id "${id}" not found.`);
    }

    return result;
  }

  async listLeavePolicyAssignments(filters?: LeavePolicyAssignmentFilters) {
    const parsed = filters
      ? parse(LeavePolicyAssignmentFiltersSchema, filters)
      : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leavePolicyAssignment.employeeId, parsed.employeeId));
    }
    if (parsed.leavePolicy) {
      conditions.push(
        eq(leavePolicyAssignment.leavePolicy, parsed.leavePolicy),
      );
    }
    if (parsed.leavePeriod) {
      conditions.push(
        eq(leavePolicyAssignment.leavePeriod, parsed.leavePeriod),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(leavePolicyAssignment).where(whereClause);
  }

  async deleteLeavePolicyAssignment(id: string) {
    const [deleted] = await this.db
      .delete(leavePolicyAssignment)
      .where(eq(leavePolicyAssignment.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Allocation ────────────────────────────────────────────────────

  async createLeaveAllocation(input: CreateLeaveAllocationInput) {
    const parsed = parse(CreateLeaveAllocationSchema, input);

    // Verify leave type exists
    await this.getLeaveTypeById(parsed.leaveType);

    // Verify leave period exists
    await this.getLeavePeriodById(parsed.leavePeriod);

    const [result] = await this.db
      .insert(leaveAllocation)
      .values({
        carryForwardedDays: parsed.carryForwardedDays ?? "0",
        earnedDays: parsed.earnedDays ?? "0",
        employeeId: parsed.employeeId,
        leavePeriod: parsed.leavePeriod,
        leavePolicyAssignment: parsed.leavePolicyAssignment ?? null,
        leaveType: parsed.leaveType,
        totalDays: parsed.totalDays,
        usedDays: parsed.usedDays ?? "0",
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create leave allocation.");
    }

    return result;
  }

  async updateLeaveAllocation(id: string, patch: UpdateLeaveAllocationInput) {
    const parsed = parse(UpdateLeaveAllocationSchema, patch);

    const [updated] = await this.db
      .update(leaveAllocation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveAllocation.id, id))
      .returning();

    return updated;
  }

  async getLeaveAllocationById(id: string) {
    const [result] = await this.db
      .select()
      .from(leaveAllocation)
      .where(eq(leaveAllocation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave allocation with id "${id}" not found.`);
    }

    return result;
  }

  async listLeaveAllocations(filters?: LeaveAllocationFilters) {
    const parsed = filters ? parse(LeaveAllocationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveAllocation.employeeId, parsed.employeeId));
    }
    if (parsed.leaveType) {
      conditions.push(eq(leaveAllocation.leaveType, parsed.leaveType));
    }
    if (parsed.leavePeriod) {
      conditions.push(eq(leaveAllocation.leavePeriod, parsed.leavePeriod));
    }
    if (parsed.status) {
      conditions.push(eq(leaveAllocation.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(leaveAllocation).where(whereClause);
  }

  async getLeaveBalance(
    employeeId: string,
    leavePeriod: string,
  ): Promise<LeaveBalance[]> {
    const allocations = await this.db
      .select()
      .from(leaveAllocation)
      .where(
        and(
          eq(leaveAllocation.employeeId, employeeId),
          eq(leaveAllocation.leavePeriod, leavePeriod),
        ),
      );

    return allocations.map((alloc) => ({
      allocated: parseFloat(alloc.totalDays),
      carryForwarded: parseFloat(alloc.carryForwardedDays),
      earned: parseFloat(alloc.earnedDays),
      leaveType: alloc.leaveType,
      remaining:
        parseFloat(alloc.totalDays) +
        parseFloat(alloc.carryForwardedDays) +
        parseFloat(alloc.earnedDays) -
        parseFloat(alloc.usedDays),
      used: parseFloat(alloc.usedDays),
    }));
  }

  async deleteLeaveAllocation(id: string) {
    const [updated] = await this.db
      .update(leaveAllocation)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(leaveAllocation.id, id))
      .returning();

    return updated;
  }

  // ─── Leave Application ───────────────────────────────────────────────────

  async createLeaveApplication(input: CreateLeaveApplicationInput) {
    const parsed = parse(CreateLeaveApplicationSchema, input);

    // Verify leave type exists
    const leaveTypeRecord = await this.getLeaveTypeById(parsed.leaveType);

    // Check if leave is blocked
    await this.checkLeaveBlockList(
      parsed.employeeId,
      parsed.fromDate,
      parsed.toDate,
    );

    // Check leave balance
    if (!leaveTypeRecord.isLeaveWithoutPay) {
      await this.checkLeaveBalance(
        parsed.employeeId,
        parsed.leaveType,
        parseFloat(parsed.totalDays),
      );
    }

    const [result] = await this.db
      .insert(leaveApplication)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        halfDayDate: parsed.halfDayDate ?? null,
        isHalfDay: parsed.isHalfDay ?? false,
        leaveAllocation: parsed.leaveAllocation ?? null,
        leaveType: parsed.leaveType,
        reason: parsed.reason ?? null,
        toDate: parsed.toDate,
        totalDays: parsed.totalDays,
      })
      .returning();

    return result;
  }

  async updateLeaveApplication(id: string, patch: UpdateLeaveApplicationInput) {
    const parsed = parse(UpdateLeaveApplicationSchema, patch);

    const [updated] = await this.db
      .update(leaveApplication)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  }

  async getLeaveApplicationById(id: string) {
    const [result] = await this.db
      .select()
      .from(leaveApplication)
      .where(eq(leaveApplication.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave application with id "${id}" not found.`);
    }

    return result;
  }

  async listLeaveApplications(filters?: LeaveApplicationFilters) {
    const parsed = filters ? parse(LeaveApplicationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveApplication.employeeId, parsed.employeeId));
    }
    if (parsed.leaveType) {
      conditions.push(eq(leaveApplication.leaveType, parsed.leaveType));
    }
    if (parsed.status) {
      conditions.push(eq(leaveApplication.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(leaveApplication).where(whereClause);
  }

  async approveLeaveApplication(id: string, approvedBy: string) {
    const application = await this.getLeaveApplicationById(id);

    // Update leave allocation
    if (application.leaveAllocation) {
      const allocation = await this.getLeaveAllocationById(
        application.leaveAllocation,
      );
      const newUsedDays =
        parseFloat(allocation.usedDays) + parseFloat(application.totalDays);

      await this.updateLeaveAllocation(allocation.id, {
        usedDays: newUsedDays.toString(),
      });
    }

    // Create ledger entry
    await this.createLedgerEntry({
      days: application.totalDays,
      description: `Leave application approved`,
      employeeId: application.employeeId,
      leaveApplication: application.id,
      leaveType: application.leaveType,
      transactionType: "application",
    });

    const [updated] = await this.db
      .update(leaveApplication)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  }

  async rejectLeaveApplication(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(leaveApplication)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  }

  async cancelLeaveApplication(id: string) {
    const application = await this.getLeaveApplicationById(id);

    // Revert leave allocation
    if (application.leaveAllocation) {
      const allocation = await this.getLeaveAllocationById(
        application.leaveAllocation,
      );
      const newUsedDays =
        parseFloat(allocation.usedDays) - parseFloat(application.totalDays);

      await this.updateLeaveAllocation(allocation.id, {
        usedDays: Math.max(0, newUsedDays).toString(),
      });
    }

    // Create ledger entry
    await this.createLedgerEntry({
      days: `-${application.totalDays}`,
      description: `Leave application cancelled`,
      employeeId: application.employeeId,
      leaveApplication: application.id,
      leaveType: application.leaveType,
      transactionType: "cancellation",
    });

    const [updated] = await this.db
      .update(leaveApplication)
      .set({
        cancelledAt: new Date(),
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  }

  async deleteLeaveApplication(id: string) {
    const [deleted] = await this.db
      .delete(leaveApplication)
      .where(eq(leaveApplication.id, id))
      .returning();

    return deleted;
  }

  // ─── Compensatory Leave Request ──────────────────────────────────────────

  async createCompensatoryLeave(input: CreateCompensatoryLeaveInput) {
    const parsed = parse(CreateCompensatoryLeaveSchema, input);

    const [result] = await this.db
      .insert(compensatoryLeaveRequest)
      .values({
        employeeId: parsed.employeeId,
        leaveType: parsed.leaveType,
        numberOfDays: parsed.numberOfDays ?? "1",
        reason: parsed.reason,
        workDate: parsed.workDate,
      })
      .returning();

    return result;
  }

  async updateCompensatoryLeave(
    id: string,
    patch: UpdateCompensatoryLeaveInput,
  ) {
    const parsed = parse(UpdateCompensatoryLeaveSchema, patch);

    const [updated] = await this.db
      .update(compensatoryLeaveRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return updated;
  }

  async getCompensatoryLeaveById(id: string) {
    const [result] = await this.db
      .select()
      .from(compensatoryLeaveRequest)
      .where(eq(compensatoryLeaveRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Compensatory leave request with id "${id}" not found.`);
    }

    return result;
  }

  async listCompensatoryLeaves(filters?: CompensatoryLeaveFilters) {
    const parsed = filters
      ? parse(CompensatoryLeaveFiltersSchema, filters)
      : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(
        eq(compensatoryLeaveRequest.employeeId, parsed.employeeId),
      );
    }
    if (parsed.status) {
      conditions.push(eq(compensatoryLeaveRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(compensatoryLeaveRequest).where(whereClause);
  }

  async approveCompensatoryLeave(id: string, approvedBy: string) {
    const request = await this.getCompensatoryLeaveById(id);

    // Create leave allocation for compensatory leave
    const allocation = await this.createLeaveAllocation({
      carryForwardedDays: "0",
      employeeId: request.employeeId,
      leavePeriod: "", // Will need to be provided
      leaveType: request.leaveType,
      totalDays: request.numberOfDays,
    });

    // Create ledger entry
    await this.createLedgerEntry({
      days: request.numberOfDays,
      description: `Compensatory leave approved for work on ${request.workDate}`,
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      transactionType: "compensatory",
    });

    const [updated] = await this.db
      .update(compensatoryLeaveRequest)
      .set({
        approvedAt: new Date(),
        approvedBy,
        leaveAllocation: allocation.id,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return updated;
  }

  async rejectCompensatoryLeave(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(compensatoryLeaveRequest)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return updated;
  }

  async deleteCompensatoryLeave(id: string) {
    const [deleted] = await this.db
      .delete(compensatoryLeaveRequest)
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Encashment ────────────────────────────────────────────────────

  async createLeaveEncashment(input: CreateLeaveEncashmentInput) {
    const parsed = parse(CreateLeaveEncashmentSchema, input);

    const [result] = await this.db
      .insert(leaveEncashment)
      .values({
        employeeId: parsed.employeeId,
        encashableDays: parsed.encashableDays,
        encashedDays: parsed.encashedDays,
        leavePeriod: parsed.leavePeriod,
        leaveType: parsed.leaveType,
      })
      .returning();

    return result;
  }

  async updateLeaveEncashment(id: string, patch: UpdateLeaveEncashmentInput) {
    const parsed = parse(UpdateLeaveEncashmentSchema, patch);

    const [updated] = await this.db
      .update(leaveEncashment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  }

  async getLeaveEncashmentById(id: string) {
    const [result] = await this.db
      .select()
      .from(leaveEncashment)
      .where(eq(leaveEncashment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave encashment with id "${id}" not found.`);
    }

    return result;
  }

  async listLeaveEncashments(filters?: LeaveEncashmentFilters) {
    const parsed = filters ? parse(LeaveEncashmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveEncashment.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(leaveEncashment.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(leaveEncashment).where(whereClause);
  }

  async approveLeaveEncashment(id: string, approvedBy: string) {
    const [updated] = await this.db
      .update(leaveEncashment)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  }

  async rejectLeaveEncashment(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(leaveEncashment)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  }

  async markLeaveEncashmentPaid(id: string) {
    const [updated] = await this.db
      .update(leaveEncashment)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  }

  async deleteLeaveEncashment(id: string) {
    const [deleted] = await this.db
      .delete(leaveEncashment)
      .where(eq(leaveEncashment.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Block List ────────────────────────────────────────────────────

  async createLeaveBlockList(input: CreateLeaveBlockListInput) {
    const parsed = parse(CreateLeaveBlockListSchema, input);

    const [result] = await this.db
      .insert(leaveBlockList)
      .values({
        company: parsed.company ?? null,
        department: parsed.department ?? null,
        fromDate: parsed.fromDate,
        name: parsed.name,
        reason: parsed.reason ?? null,
        scope: parsed.scope,
        toDate: parsed.toDate,
      })
      .returning();

    return result;
  }

  async updateLeaveBlockList(id: string, patch: UpdateLeaveBlockListInput) {
    const parsed = parse(UpdateLeaveBlockListSchema, patch);

    const [updated] = await this.db
      .update(leaveBlockList)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveBlockList.id, id))
      .returning();

    return updated;
  }

  async getLeaveBlockListById(id: string) {
    const [result] = await this.db
      .select()
      .from(leaveBlockList)
      .where(eq(leaveBlockList.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave block list with id "${id}" not found.`);
    }

    return result;
  }

  async listLeaveBlockLists(filters?: LeaveBlockListFilters) {
    const parsed = filters ? parse(LeaveBlockListFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.company) {
      conditions.push(eq(leaveBlockList.company, parsed.company));
    }
    if (parsed.department) {
      conditions.push(eq(leaveBlockList.department, parsed.department));
    }
    if (parsed.scope) {
      conditions.push(eq(leaveBlockList.scope, parsed.scope));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(leaveBlockList).where(whereClause);
  }

  async deleteLeaveBlockList(id: string) {
    const [deleted] = await this.db
      .delete(leaveBlockList)
      .where(eq(leaveBlockList.id, id))
      .returning();

    return deleted;
  }

  // ─── Leave Adjustment ────────────────────────────────────────────────────

  async createLeaveAdjustment(input: CreateLeaveAdjustmentInput) {
    const parsed = parse(CreateLeaveAdjustmentSchema, input);

    // Create ledger entry
    const ledgerEntry = await this.createLedgerEntry({
      days: parsed.days,
      description: `Manual adjustment: ${parsed.reason}`,
      employeeId: parsed.employeeId,
      leaveType: parsed.leaveType,
      transactionType: "adjustment",
    });

    const [result] = await this.db
      .insert(leaveAdjustment)
      .values({
        adjustedBy: parsed.adjustedBy,
        days: parsed.days,
        employeeId: parsed.employeeId,
        leaveLedgerEntry: ledgerEntry.id,
        leavePeriod: parsed.leavePeriod ?? null,
        leaveType: parsed.leaveType,
        reason: parsed.reason,
      })
      .returning();

    return result;
  }

  async listLeaveAdjustments(employeeId: string) {
    return this.db
      .select()
      .from(leaveAdjustment)
      .where(eq(leaveAdjustment.employeeId, employeeId));
  }

  // ─── Leave Ledger Entry ──────────────────────────────────────────────────

  private async createLedgerEntry(input: {
    days: string;
    description: string;
    employeeId: string;
    leaveApplication?: string;
    leaveType: string;
    transactionType: string;
  }) {
    const [result] = await this.db
      .insert(leaveLedgerEntry)
      .values({
        days: input.days,
        description: input.description,
        employeeId: input.employeeId,
        leaveApplication: input.leaveApplication ?? null,
        leaveType: input.leaveType,
        transactionType: input.transactionType,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create leave ledger entry.");
    }

    return result;
  }

  async listLedgerEntries(employeeId: string, leaveType?: string) {
    const conditions = [eq(leaveLedgerEntry.employeeId, employeeId)];
    if (leaveType) {
      conditions.push(eq(leaveLedgerEntry.leaveType, leaveType));
    }

    return this.db
      .select()
      .from(leaveLedgerEntry)
      .where(and(...conditions));
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────

  private async checkLeaveBlockList(
    _employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    const blockedDates = await this.db
      .select()
      .from(leaveBlockList)
      .where(
        and(
          eq(leaveBlockList.isActive, true),
          sql`${leaveBlockList.fromDate} <= ${toDate}`,
          sql`${leaveBlockList.toDate} >= ${fromDate}`,
        ),
      );

    if (blockedDates.length > 0) {
      throw new Error(
        `Leave is blocked for the selected dates. Blocked periods: ${blockedDates.map((b) => b.name).join(", ")}`,
      );
    }
  }

  private async checkLeaveBalance(
    employeeId: string,
    leaveType: string,
    days: number,
  ): Promise<void> {
    const allocations = await this.db
      .select()
      .from(leaveAllocation)
      .where(
        and(
          eq(leaveAllocation.employeeId, employeeId),
          eq(leaveAllocation.leaveType, leaveType),
          eq(leaveAllocation.status, "active"),
        ),
      );

    const leaveTypeRecord = await this.getLeaveTypeById(leaveType);

    if (allocations.length === 0) {
      if (!leaveTypeRecord.allowNegativeBalance) {
        throw new Error(
          `No active leave allocation found for leave type "${leaveType}".`,
        );
      }
      return;
    }

    const allocation = allocations[0];
    if (!allocation) {
      throw new Error(
        `No active leave allocation found for leave type "${leaveType}".`,
      );
    }

    const available =
      parseFloat(allocation.totalDays) +
      parseFloat(allocation.carryForwardedDays) +
      parseFloat(allocation.earnedDays) -
      parseFloat(allocation.usedDays);

    if (days > available && !leaveTypeRecord.allowNegativeBalance) {
      throw new Error(
        `Insufficient leave balance. Available: ${available} days, Requested: ${days} days.`,
      );
    }
  }
}
