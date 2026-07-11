import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrSettings,
  payrollSettings,
} from "../db-schema";
import type {
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateEmployeeGradeInput,
  CreateEmploymentTypeInput,
  CreateHolidayInput,
  CreateHolidayListInput,
  DepartmentFilters,
  UpdateDepartmentInput,
  UpdateDesignationInput,
  UpdateEmployeeGradeInput,
  UpdateEmploymentTypeInput,
  UpdateHolidayInput,
  UpdateHolidayListInput,
  UpdateHrSettingsInput,
  UpdatePayrollSettingsInput,
} from "../types";
import {
  CreateDepartmentSchema,
  CreateDesignationSchema,
  CreateEmployeeGradeSchema,
  CreateEmploymentTypeSchema,
  CreateHolidayListSchema,
  CreateHolidaySchema,
  DepartmentFiltersSchema,
  UpdateDepartmentSchema,
  UpdateDesignationSchema,
  UpdateEmployeeGradeSchema,
  UpdateEmploymentTypeSchema,
  UpdateHolidayListSchema,
  UpdateHolidaySchema,
  UpdateHrSettingsSchema,
  UpdatePayrollSettingsSchema,
} from "../types";

export class SetupWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── HR Settings ─────────────────────────────────────────────────────────

  async getHrSettings() {
    const [settings] = await this.db.select().from(hrSettings).limit(1);
    return settings ?? null;
  }

  async updateHrSettings(patch: UpdateHrSettingsInput) {
    const current = await this.getHrSettings();
    const parsed = parse(UpdateHrSettingsSchema, patch);

    if (!current) {
      const [created] = await this.db
        .insert(hrSettings)
        .values(parsed)
        .returning();
      return created;
    }

    const [updated] = await this.db
      .update(hrSettings)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrSettings.id, current.id))
      .returning();

    return updated;
  }

  // ─── Payroll Settings ────────────────────────────────────────────────────

  async getPayrollSettings() {
    const [settings] = await this.db.select().from(payrollSettings).limit(1);
    return settings ?? null;
  }

  async updatePayrollSettings(patch: UpdatePayrollSettingsInput) {
    const current = await this.getPayrollSettings();
    const parsed = parse(UpdatePayrollSettingsSchema, patch);

    if (!current) {
      const [created] = await this.db
        .insert(payrollSettings)
        .values(parsed)
        .returning();
      return created;
    }

    const [updated] = await this.db
      .update(payrollSettings)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(payrollSettings.id, current.id))
      .returning();

    return updated;
  }

  // ─── Employment Type ─────────────────────────────────────────────────────

  async createEmploymentType(input: CreateEmploymentTypeInput) {
    const parsed = parse(CreateEmploymentTypeSchema, input);

    const [result] = await this.db
      .insert(employmentType)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateEmploymentType(id: string, patch: UpdateEmploymentTypeInput) {
    const parsed = parse(UpdateEmploymentTypeSchema, patch);

    const [updated] = await this.db
      .update(employmentType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employmentType.id, id))
      .returning();

    return updated;
  }

  async getEmploymentTypeById(id: string) {
    const [result] = await this.db
      .select()
      .from(employmentType)
      .where(eq(employmentType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employment type with id "${id}" not found.`);
    }

    return result;
  }

  async listEmploymentTypes() {
    return this.db.select().from(employmentType);
  }

  async deleteEmploymentType(id: string) {
    const [updated] = await this.db
      .update(employmentType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employmentType.id, id))
      .returning();

    return updated;
  }

  // ─── Department ──────────────────────────────────────────────────────────

  async createDepartment(input: CreateDepartmentInput) {
    const parsed = parse(CreateDepartmentSchema, input);

    if (parsed.parentDepartment) {
      await this.validateParentDepartment(parsed.parentDepartment);
    }

    const [result] = await this.db
      .insert(department)
      .values({
        code: parsed.code.toUpperCase(),
        manager: parsed.manager ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        parentDepartment: parsed.parentDepartment ?? null,
      })
      .returning();

    return result;
  }

  async updateDepartment(id: string, patch: UpdateDepartmentInput) {
    const parsed = parse(UpdateDepartmentSchema, patch);

    if (parsed.code !== undefined) {
      await this.ensureDepartmentCodeUnique(parsed.code, id);
    }

    if (
      parsed.parentDepartment !== undefined &&
      parsed.parentDepartment !== null
    ) {
      if (parsed.parentDepartment === id) {
        throw new Error("A department cannot be its own parent.");
      }
      await this.validateParentDepartment(parsed.parentDepartment, id);
    }

    const [updated] = await this.db
      .update(department)
      .set({
        ...parsed,
        code: parsed.code?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(department.id, id))
      .returning();

    return updated;
  }

  async getDepartmentById(id: string) {
    const [result] = await this.db
      .select()
      .from(department)
      .where(eq(department.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Department with id "${id}" not found.`);
    }

    return result;
  }

  async listDepartments(filters?: DepartmentFilters) {
    const parsed = filters ? parse(DepartmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.isActive !== undefined) {
      conditions.push(eq(department.isActive, parsed.isActive));
    }
    if (parsed.parentDepartment) {
      conditions.push(eq(department.parentDepartment, parsed.parentDepartment));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(department).where(whereClause);
  }

  async deleteDepartment(id: string) {
    const [updated] = await this.db
      .update(department)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();

    return updated;
  }

  private async ensureDepartmentCodeUnique(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const upperCode = code.toUpperCase();
    const conditions = [eq(department.code, upperCode)];
    if (excludeId) {
      conditions.push(sql`${department.id} != ${excludeId}`);
    }

    const [existing] = await this.db
      .select({ id: department.id })
      .from(department)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new Error(`Department code "${upperCode}" already exists.`);
    }
  }

  private async validateParentDepartment(
    parentId: string,
    childId?: string,
  ): Promise<void> {
    if (childId) {
      const wouldCycle = await this.wouldCreateCircular(childId, parentId);
      if (wouldCycle) {
        throw new Error(
          "Setting this parent would create a circular reference.",
        );
      }
    }
  }

  private async wouldCreateCircular(
    deptId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;
    let depth = 0;
    const maxDepth = 10;

    while (currentId !== null) {
      if (currentId === deptId) return true;
      if (depth >= maxDepth) return true;

      const [parent] = await this.db
        .select({ parentDepartment: department.parentDepartment })
        .from(department)
        .where(eq(department.id, currentId))
        .limit(1);

      if (!parent) break;
      currentId = parent.parentDepartment;
      depth++;
    }

    return false;
  }

  // ─── Designation ─────────────────────────────────────────────────────────

  async createDesignation(input: CreateDesignationInput) {
    const parsed = parse(CreateDesignationSchema, input);

    const [result] = await this.db
      .insert(designation)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateDesignation(id: string, patch: UpdateDesignationInput) {
    const parsed = parse(UpdateDesignationSchema, patch);

    const [updated] = await this.db
      .update(designation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();

    return updated;
  }

  async getDesignationById(id: string) {
    const [result] = await this.db
      .select()
      .from(designation)
      .where(eq(designation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Designation with id "${id}" not found.`);
    }

    return result;
  }

  async listDesignations() {
    return this.db.select().from(designation);
  }

  async deleteDesignation(id: string) {
    const [updated] = await this.db
      .update(designation)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();

    return updated;
  }

  // ─── Employee Grade ──────────────────────────────────────────────────────

  async createEmployeeGrade(input: CreateEmployeeGradeInput) {
    const parsed = parse(CreateEmployeeGradeSchema, input);

    const [result] = await this.db
      .insert(employeeGrade)
      .values({
        defaultSalaryStructure: parsed.defaultSalaryStructure ?? null,
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateEmployeeGrade(id: string, patch: UpdateEmployeeGradeInput) {
    const parsed = parse(UpdateEmployeeGradeSchema, patch);

    const [updated] = await this.db
      .update(employeeGrade)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeGrade.id, id))
      .returning();

    return updated;
  }

  async getEmployeeGradeById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeGrade)
      .where(eq(employeeGrade.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employee grade with id "${id}" not found.`);
    }

    return result;
  }

  async listEmployeeGrades() {
    return this.db.select().from(employeeGrade);
  }

  async deleteEmployeeGrade(id: string) {
    const [updated] = await this.db
      .update(employeeGrade)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employeeGrade.id, id))
      .returning();

    return updated;
  }

  // ─── Holiday List ────────────────────────────────────────────────────────

  async createHolidayList(input: CreateHolidayListInput) {
    const parsed = parse(CreateHolidayListSchema, input);

    const [result] = await this.db
      .insert(holidayList)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
        weeklyOffDays: parsed.weeklyOffDays ?? [],
        year: parsed.year,
      })
      .returning();

    return result;
  }

  async updateHolidayList(id: string, patch: UpdateHolidayListInput) {
    const parsed = parse(UpdateHolidayListSchema, patch);

    const [updated] = await this.db
      .update(holidayList)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(holidayList.id, id))
      .returning();

    return updated;
  }

  async getHolidayListById(id: string) {
    const [result] = await this.db
      .select()
      .from(holidayList)
      .where(eq(holidayList.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Holiday list with id "${id}" not found.`);
    }

    return result;
  }

  async listHolidayLists() {
    return this.db.select().from(holidayList);
  }

  async deleteHolidayList(id: string) {
    const [updated] = await this.db
      .update(holidayList)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(holidayList.id, id))
      .returning();

    return updated;
  }

  // ─── Holiday ─────────────────────────────────────────────────────────────

  async createHoliday(input: CreateHolidayInput) {
    const parsed = parse(CreateHolidaySchema, input);

    // Verify holiday list exists
    await this.getHolidayListById(parsed.holidayListId);

    const [result] = await this.db
      .insert(holiday)
      .values({
        date: parsed.date,
        description: parsed.description ?? null,
        holidayListId: parsed.holidayListId,
        name: parsed.name,
        type: parsed.type ?? "public",
      })
      .returning();

    return result;
  }

  async updateHoliday(id: string, patch: UpdateHolidayInput) {
    const parsed = parse(UpdateHolidaySchema, patch);

    const [updated] = await this.db
      .update(holiday)
      .set(parsed)
      .where(eq(holiday.id, id))
      .returning();

    return updated;
  }

  async getHolidayById(id: string) {
    const [result] = await this.db
      .select()
      .from(holiday)
      .where(eq(holiday.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Holiday with id "${id}" not found.`);
    }

    return result;
  }

  async listHolidaysByList(holidayListId: string) {
    return this.db
      .select()
      .from(holiday)
      .where(eq(holiday.holidayListId, holidayListId));
  }

  async deleteHoliday(id: string) {
    const [deleted] = await this.db
      .delete(holiday)
      .where(eq(holiday.id, id))
      .returning();

    return deleted;
  }
}
