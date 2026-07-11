import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeTransfer,
  exitInterview,
  fullAndFinalStatement,
  onboardingTask,
  separationTask,
} from "../db-schema";
import type {
  CreateExitInterviewInput,
  CreateFullAndFinalInput,
  CreateOnboardingInput,
  CreateOnboardingTaskInput,
  CreatePromotionInput,
  CreateSeparationInput,
  CreateSeparationTaskInput,
  CreateTransferInput,
  ExitInterviewFilters,
  FullAndFinalFilters,
  OnboardingFilters,
  PromotionFilters,
  SeparationFilters,
  TransferFilters,
  UpdateExitInterviewInput,
  UpdateFullAndFinalInput,
  UpdateOnboardingInput,
  UpdateOnboardingTaskInput,
  UpdatePromotionInput,
  UpdateSeparationInput,
  UpdateSeparationTaskInput,
  UpdateTransferInput,
} from "../types";
import {
  CreateExitInterviewSchema,
  CreateFullAndFinalSchema,
  CreateOnboardingSchema,
  CreateOnboardingTaskSchema,
  CreatePromotionSchema,
  CreateSeparationSchema,
  CreateSeparationTaskSchema,
  CreateTransferSchema,
  ExitInterviewFiltersSchema,
  FullAndFinalFiltersSchema,
  OnboardingFiltersSchema,
  PromotionFiltersSchema,
  SeparationFiltersSchema,
  TransferFiltersSchema,
  UpdateExitInterviewSchema,
  UpdateFullAndFinalSchema,
  UpdateOnboardingSchema,
  UpdateOnboardingTaskSchema,
  UpdatePromotionSchema,
  UpdateSeparationSchema,
  UpdateSeparationTaskSchema,
  UpdateTransferSchema,
} from "../types";

export class LifecycleWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Employee Onboarding ─────────────────────────────────────────────────

  async createOnboarding(input: CreateOnboardingInput) {
    const parsed = parse(CreateOnboardingSchema, input);

    const [result] = await this.db
      .insert(employeeOnboarding)
      .values({
        employeeId: parsed.employeeId,
        expectedCompletionDate: parsed.expectedCompletionDate ?? null,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  }

  async updateOnboarding(id: string, patch: UpdateOnboardingInput) {
    const parsed = parse(UpdateOnboardingSchema, patch);

    const [updated] = await this.db
      .update(employeeOnboarding)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return updated;
  }

  async getOnboardingById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeOnboarding)
      .where(eq(employeeOnboarding.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Onboarding with id "${id}" not found.`);
    }

    return result;
  }

  async listOnboardings(filters?: OnboardingFilters) {
    const parsed = filters ? parse(OnboardingFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeOnboarding.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeOnboarding.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employeeOnboarding).where(whereClause);
  }

  async deleteOnboarding(id: string) {
    // Delete tasks first
    await this.db
      .delete(onboardingTask)
      .where(eq(onboardingTask.onboardingId, id));

    const [deleted] = await this.db
      .delete(employeeOnboarding)
      .where(eq(employeeOnboarding.id, id))
      .returning();

    return deleted;
  }

  // ─── Onboarding Task ─────────────────────────────────────────────────────

  async createOnboardingTask(input: CreateOnboardingTaskInput) {
    const parsed = parse(CreateOnboardingTaskSchema, input);

    // Verify onboarding exists
    await this.getOnboardingById(parsed.onboardingId);

    const [result] = await this.db
      .insert(onboardingTask)
      .values({
        assignedTo: parsed.assignedTo ?? null,
        department: parsed.department ?? null,
        description: parsed.description ?? null,
        dueDate: parsed.dueDate ?? null,
        notes: parsed.notes ?? null,
        onboardingId: parsed.onboardingId,
        title: parsed.title,
      })
      .returning();

    return result;
  }

  async updateOnboardingTask(id: string, patch: UpdateOnboardingTaskInput) {
    const parsed = parse(UpdateOnboardingTaskSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await this.db
      .update(onboardingTask)
      .set(updateData)
      .where(eq(onboardingTask.id, id))
      .returning();

    return updated;
  }

  async getOnboardingTaskById(id: string) {
    const [result] = await this.db
      .select()
      .from(onboardingTask)
      .where(eq(onboardingTask.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Onboarding task with id "${id}" not found.`);
    }

    return result;
  }

  async listOnboardingTasks(onboardingId: string) {
    return this.db
      .select()
      .from(onboardingTask)
      .where(eq(onboardingTask.onboardingId, onboardingId));
  }

  async completeOnboardingTask(id: string, completedBy: string) {
    const [updated] = await this.db
      .update(onboardingTask)
      .set({
        completedAt: new Date(),
        completedBy,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(onboardingTask.id, id))
      .returning();

    return updated;
  }

  async deleteOnboardingTask(id: string) {
    const [deleted] = await this.db
      .delete(onboardingTask)
      .where(eq(onboardingTask.id, id))
      .returning();

    return deleted;
  }

  // ─── Employee Promotion ──────────────────────────────────────────────────

  async createPromotion(input: CreatePromotionInput) {
    const parsed = parse(CreatePromotionSchema, input);

    const [result] = await this.db
      .insert(employeePromotion)
      .values({
        currentDepartment: parsed.currentDepartment ?? null,
        currentDesignation: parsed.currentDesignation,
        currentGrade: parsed.currentGrade ?? null,
        effectiveDate: parsed.effectiveDate,
        employeeId: parsed.employeeId,
        newDepartment: parsed.newDepartment ?? null,
        newDesignation: parsed.newDesignation,
        newGrade: parsed.newGrade ?? null,
        reason: parsed.reason ?? null,
        salaryRevision: parsed.salaryRevision ?? null,
      })
      .returning();

    return result;
  }

  async updatePromotion(id: string, patch: UpdatePromotionInput) {
    const parsed = parse(UpdatePromotionSchema, patch);

    const [updated] = await this.db
      .update(employeePromotion)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  }

  async getPromotionById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeePromotion)
      .where(eq(employeePromotion.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Promotion with id "${id}" not found.`);
    }

    return result;
  }

  async listPromotions(filters?: PromotionFilters) {
    const parsed = filters ? parse(PromotionFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeePromotion.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeePromotion.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employeePromotion).where(whereClause);
  }

  async approvePromotion(id: string, approvedBy: string) {
    const [updated] = await this.db
      .update(employeePromotion)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  }

  async rejectPromotion(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(employeePromotion)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  }

  async completePromotion(id: string) {
    const promotion = await this.getPromotionById(id);

    // Update employee record
    const updateData: Record<string, unknown> = {
      designation: promotion.newDesignation,
      updatedAt: new Date(),
    };
    if (promotion.newGrade) {
      updateData.grade = promotion.newGrade;
    }
    if (promotion.newDepartment) {
      updateData.department = promotion.newDepartment;
    }

    // This would require access to employee workflow
    // For now, just mark as completed
    const [updated] = await this.db
      .update(employeePromotion)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  }

  async deletePromotion(id: string) {
    const [deleted] = await this.db
      .delete(employeePromotion)
      .where(eq(employeePromotion.id, id))
      .returning();

    return deleted;
  }

  // ─── Employee Transfer ───────────────────────────────────────────────────

  async createTransfer(input: CreateTransferInput) {
    const parsed = parse(CreateTransferSchema, input);

    const [result] = await this.db
      .insert(employeeTransfer)
      .values({
        effectiveDate: parsed.effectiveDate,
        employeeId: parsed.employeeId,
        fromBranch: parsed.fromBranch ?? null,
        fromCompany: parsed.fromCompany ?? null,
        fromDepartment: parsed.fromDepartment ?? null,
        reason: parsed.reason ?? null,
        toBranch: parsed.toBranch ?? null,
        toCompany: parsed.toCompany ?? null,
        toDepartment: parsed.toDepartment ?? null,
      })
      .returning();

    return result;
  }

  async updateTransfer(id: string, patch: UpdateTransferInput) {
    const parsed = parse(UpdateTransferSchema, patch);

    const [updated] = await this.db
      .update(employeeTransfer)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  }

  async getTransferById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeTransfer)
      .where(eq(employeeTransfer.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Transfer with id "${id}" not found.`);
    }

    return result;
  }

  async listTransfers(filters?: TransferFilters) {
    const parsed = filters ? parse(TransferFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeTransfer.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeTransfer.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employeeTransfer).where(whereClause);
  }

  async approveTransfer(id: string, approvedBy: string) {
    const [updated] = await this.db
      .update(employeeTransfer)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  }

  async rejectTransfer(
    id: string,
    rejectedBy: string,
    rejectionReason: string,
  ) {
    const [updated] = await this.db
      .update(employeeTransfer)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  }

  async completeTransfer(id: string) {
    const transfer = await this.getTransferById(id);

    // Update employee record
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (transfer.toBranch) {
      updateData.branch = transfer.toBranch;
    }
    if (transfer.toDepartment) {
      updateData.department = transfer.toDepartment;
    }
    if (transfer.toCompany) {
      updateData.company = transfer.toCompany;
    }

    // This would require access to employee workflow
    // For now, just mark as completed
    const [updated] = await this.db
      .update(employeeTransfer)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  }

  async deleteTransfer(id: string) {
    const [deleted] = await this.db
      .delete(employeeTransfer)
      .where(eq(employeeTransfer.id, id))
      .returning();

    return deleted;
  }

  // ─── Employee Separation ─────────────────────────────────────────────────

  async createSeparation(input: CreateSeparationInput) {
    const parsed = parse(CreateSeparationSchema, input);

    const [result] = await this.db
      .insert(employeeSeparation)
      .values({
        employeeId: parsed.employeeId,
        exitDate: parsed.exitDate,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        reason: parsed.reason ?? null,
        resignationDate: parsed.resignationDate ?? null,
      })
      .returning();

    return result;
  }

  async updateSeparation(id: string, patch: UpdateSeparationInput) {
    const parsed = parse(UpdateSeparationSchema, patch);

    const [updated] = await this.db
      .update(employeeSeparation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeSeparation.id, id))
      .returning();

    return updated;
  }

  async getSeparationById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeSeparation)
      .where(eq(employeeSeparation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Separation with id "${id}" not found.`);
    }

    return result;
  }

  async listSeparations(filters?: SeparationFilters) {
    const parsed = filters ? parse(SeparationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeSeparation.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeSeparation.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employeeSeparation).where(whereClause);
  }

  async deleteSeparation(id: string) {
    // Delete tasks first
    await this.db
      .delete(separationTask)
      .where(eq(separationTask.separationId, id));

    const [deleted] = await this.db
      .delete(employeeSeparation)
      .where(eq(employeeSeparation.id, id))
      .returning();

    return deleted;
  }

  // ─── Separation Task ─────────────────────────────────────────────────────

  async createSeparationTask(input: CreateSeparationTaskInput) {
    const parsed = parse(CreateSeparationTaskSchema, input);

    // Verify separation exists
    await this.getSeparationById(parsed.separationId);

    const [result] = await this.db
      .insert(separationTask)
      .values({
        assignedTo: parsed.assignedTo ?? null,
        department: parsed.department ?? null,
        description: parsed.description ?? null,
        dueDate: parsed.dueDate ?? null,
        notes: parsed.notes ?? null,
        separationId: parsed.separationId,
        title: parsed.title,
      })
      .returning();

    return result;
  }

  async updateSeparationTask(id: string, patch: UpdateSeparationTaskInput) {
    const parsed = parse(UpdateSeparationTaskSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await this.db
      .update(separationTask)
      .set(updateData)
      .where(eq(separationTask.id, id))
      .returning();

    return updated;
  }

  async getSeparationTaskById(id: string) {
    const [result] = await this.db
      .select()
      .from(separationTask)
      .where(eq(separationTask.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Separation task with id "${id}" not found.`);
    }

    return result;
  }

  async listSeparationTasks(separationId: string) {
    return this.db
      .select()
      .from(separationTask)
      .where(eq(separationTask.separationId, separationId));
  }

  async completeSeparationTask(id: string, completedBy: string) {
    const [updated] = await this.db
      .update(separationTask)
      .set({
        completedAt: new Date(),
        completedBy,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(separationTask.id, id))
      .returning();

    return updated;
  }

  async deleteSeparationTask(id: string) {
    const [deleted] = await this.db
      .delete(separationTask)
      .where(eq(separationTask.id, id))
      .returning();

    return deleted;
  }

  // ─── Exit Interview ──────────────────────────────────────────────────────

  async createExitInterview(input: CreateExitInterviewInput) {
    const parsed = parse(CreateExitInterviewSchema, input);

    const [result] = await this.db
      .insert(exitInterview)
      .values({
        employeeId: parsed.employeeId,
        interviewer: parsed.interviewer ?? null,
        questionnaireTemplate: parsed.questionnaireTemplate ?? null,
        scheduledDate: parsed.scheduledDate
          ? new Date(parsed.scheduledDate)
          : null,
        separationId: parsed.separationId ?? null,
      })
      .returning();

    return result;
  }

  async updateExitInterview(id: string, patch: UpdateExitInterviewInput) {
    const parsed = parse(UpdateExitInterviewSchema, patch);

    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };
    if (parsed.scheduledDate) {
      updateData.scheduledDate = new Date(parsed.scheduledDate);
    }
    if (parsed.completedDate) {
      updateData.completedDate = new Date(parsed.completedDate);
    }

    const [updated] = await this.db
      .update(exitInterview)
      .set(updateData)
      .where(eq(exitInterview.id, id))
      .returning();

    return updated;
  }

  async getExitInterviewById(id: string) {
    const [result] = await this.db
      .select()
      .from(exitInterview)
      .where(eq(exitInterview.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Exit interview with id "${id}" not found.`);
    }

    return result;
  }

  async listExitInterviews(filters?: ExitInterviewFilters) {
    const parsed = filters ? parse(ExitInterviewFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(exitInterview.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(exitInterview.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(exitInterview).where(whereClause);
  }

  async completeExitInterview(
    id: string,
    feedback: string,
    responses: Record<string, unknown>,
  ) {
    const [updated] = await this.db
      .update(exitInterview)
      .set({
        completedDate: new Date(),
        feedback,
        responses,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(exitInterview.id, id))
      .returning();

    return updated;
  }

  async deleteExitInterview(id: string) {
    const [deleted] = await this.db
      .delete(exitInterview)
      .where(eq(exitInterview.id, id))
      .returning();

    return deleted;
  }

  // ─── Full and Final Statement ────────────────────────────────────────────

  async createFullAndFinal(input: CreateFullAndFinalInput) {
    const parsed = parse(CreateFullAndFinalSchema, input);

    const [result] = await this.db
      .insert(fullAndFinalStatement)
      .values({
        bonus: parsed.bonus ?? "0",
        deductions: parsed.deductions ?? "0",
        employeeId: parsed.employeeId,
        gratuity: parsed.gratuity ?? "0",
        leaveEncashment: parsed.leaveEncashment ?? "0",
        loanRecovery: parsed.loanRecovery ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        pendingSalary: parsed.pendingSalary ?? "0",
        separationId: parsed.separationId ?? null,
      })
      .returning();

    return result;
  }

  async updateFullAndFinal(id: string, patch: UpdateFullAndFinalInput) {
    const parsed = parse(UpdateFullAndFinalSchema, patch);

    // Calculate totals if provided
    const updateData: Record<string, unknown> = {
      ...parsed,
      updatedAt: new Date(),
    };

    if (parsed.paidAt) {
      updateData.paidAt = new Date(parsed.paidAt);
    }

    const [updated] = await this.db
      .update(fullAndFinalStatement)
      .set(updateData)
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  }

  async getFullAndFinalById(id: string) {
    const [result] = await this.db
      .select()
      .from(fullAndFinalStatement)
      .where(eq(fullAndFinalStatement.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Full and final statement with id "${id}" not found.`);
    }

    return result;
  }

  async listFullAndFinalStatements(filters?: FullAndFinalFilters) {
    const parsed = filters ? parse(FullAndFinalFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(fullAndFinalStatement.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(fullAndFinalStatement.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(fullAndFinalStatement).where(whereClause);
  }

  async approveFullAndFinal(id: string, approvedBy: string) {
    const statement = await this.getFullAndFinalById(id);

    // Calculate totals
    const totalEarnings =
      parseFloat(statement.pendingSalary) +
      parseFloat(statement.leaveEncashment) +
      parseFloat(statement.bonus) +
      parseFloat(statement.gratuity);

    const totalDeductions =
      parseFloat(statement.loanRecovery) + parseFloat(statement.deductions);

    const netPayable = totalEarnings - totalDeductions;

    const [updated] = await this.db
      .update(fullAndFinalStatement)
      .set({
        approvedAt: new Date(),
        approvedBy,
        netPayable: netPayable.toString(),
        status: "approved",
        totalDeductions: totalDeductions.toString(),
        totalEarnings: totalEarnings.toString(),
        updatedAt: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  }

  async markFullAndFinalPaid(id: string, paymentEntry: string) {
    const [updated] = await this.db
      .update(fullAndFinalStatement)
      .set({
        paidAt: new Date(),
        paymentEntry,
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  }

  async deleteFullAndFinal(id: string) {
    const [deleted] = await this.db
      .delete(fullAndFinalStatement)
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return deleted;
  }
}
