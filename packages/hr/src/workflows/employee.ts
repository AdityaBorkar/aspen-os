import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeSkillMap,
} from "../db-schema";
import type {
  AddGroupMemberInput,
  CreateEmployeeGroupInput,
  CreateEmployeeInput,
  CreateHealthInsuranceInput,
  CreateSkillMapInput,
  EmployeeFilters,
  EmployeeTreeNode,
  UpdateEmployeeGroupInput,
  UpdateEmployeeInput,
  UpdateHealthInsuranceInput,
  UpdateSkillMapInput,
} from "../types";
import {
  AddGroupMemberSchema,
  CreateEmployeeGroupSchema,
  CreateEmployeeSchema,
  CreateHealthInsuranceSchema,
  CreateSkillMapSchema,
  EmployeeFiltersSchema,
  UpdateEmployeeGroupSchema,
  UpdateEmployeeSchema,
  UpdateHealthInsuranceSchema,
  UpdateSkillMapSchema,
} from "../types";

export class EmployeeWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  // ─── Employee CRUD ───────────────────────────────────────────────────────

  async create(input: CreateEmployeeInput) {
    const parsed = parse(CreateEmployeeSchema, input);

    // Check for unique employee ID
    await this.ensureEmployeeIdUnique(parsed.employeeId);

    const [result] = await this.db
      .insert(employee)
      .values({
        bankAccountNumber: parsed.bankAccountNumber ?? null,
        bankBranch: parsed.bankBranch ?? null,
        bankName: parsed.bankName ?? null,
        bloodGroup: parsed.bloodGroup ?? null,
        branch: parsed.branch ?? null,
        city: parsed.city ?? null,
        company: parsed.company,
        country: parsed.country ?? null,
        currentAddress: parsed.currentAddress ?? null,
        dateOfBirth: parsed.dateOfBirth ?? null,
        dateOfJoining: parsed.dateOfJoining,
        dateOfLeaving: parsed.dateOfLeaving ?? null,
        department: parsed.department,
        designation: parsed.designation,
        emergencyContactName: parsed.emergencyContactName ?? null,
        emergencyContactPhone: parsed.emergencyContactPhone ?? null,
        emergencyContactRelation: parsed.emergencyContactRelation ?? null,
        employeeId: parsed.employeeId,
        employmentType: parsed.employmentType,
        firstName: parsed.firstName,
        gender: parsed.gender ?? null,
        grade: parsed.grade ?? null,
        holidayList: parsed.holidayList ?? null,
        ifscCode: parsed.ifscCode ?? null,
        image: parsed.image ?? null,
        lastName: parsed.lastName,
        maritalStatus: parsed.maritalStatus ?? null,
        metadata: parsed.metadata ?? null,
        middleName: parsed.middleName ?? null,
        permanentAddress: parsed.permanentAddress ?? null,
        personalEmail: parsed.personalEmail ?? null,
        personalPhone: parsed.personalPhone ?? null,
        postalCode: parsed.postalCode ?? null,
        reportsTo: parsed.reportsTo ?? null,
        salaryStructureAssignment: parsed.salaryStructureAssignment ?? null,
        socialSecurityNumber: parsed.socialSecurityNumber ?? null,
        state: parsed.state ?? null,
        taxId: parsed.taxId ?? null,
        workEmail: parsed.workEmail ?? null,
        workPhone: parsed.workPhone ?? null,
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateEmployeeInput) {
    const parsed = parse(UpdateEmployeeSchema, patch);

    if (parsed.employeeId !== undefined) {
      await this.ensureEmployeeIdUnique(parsed.employeeId, id);
    }

    const [updated] = await this.db
      .update(employee)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(employee)
      .where(eq(employee.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employee with id "${id}" not found.`);
    }

    return result;
  }

  async getByEmployeeId(employeeId: string) {
    const [result] = await this.db
      .select()
      .from(employee)
      .where(eq(employee.employeeId, employeeId))
      .limit(1);

    if (!result) {
      throw new Error(`Employee with employee ID "${employeeId}" not found.`);
    }

    return result;
  }

  async list(filters?: EmployeeFilters) {
    const parsed = filters ? parse(EmployeeFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.company) {
      conditions.push(eq(employee.company, parsed.company));
    }
    if (parsed.department) {
      conditions.push(eq(employee.department, parsed.department));
    }
    if (parsed.designation) {
      conditions.push(eq(employee.designation, parsed.designation));
    }
    if (parsed.branch) {
      conditions.push(eq(employee.branch, parsed.branch));
    }
    if (parsed.grade) {
      conditions.push(eq(employee.grade, parsed.grade));
    }
    if (parsed.employmentType) {
      conditions.push(eq(employee.employmentType, parsed.employmentType));
    }
    if (parsed.status) {
      conditions.push(eq(employee.status, parsed.status));
    }
    if (parsed.reportsTo) {
      conditions.push(eq(employee.reportsTo, parsed.reportsTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(employee).where(whereClause);
  }

  async deactivate(id: string) {
    const [updated] = await this.db
      .update(employee)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  }

  async activate(id: string) {
    const [updated] = await this.db
      .update(employee)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  }

  async markAsLeft(id: string, dateOfLeaving: string) {
    const [updated] = await this.db
      .update(employee)
      .set({
        dateOfLeaving,
        status: "left",
        updatedAt: new Date(),
      })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  }

  async getOrganizationalChart(company?: string): Promise<EmployeeTreeNode[]> {
    const conditions = [eq(employee.status, "active")];
    if (company) {
      conditions.push(eq(employee.company, company));
    }

    const allEmployees = await this.db
      .select({
        designation: employee.designation,
        firstName: employee.firstName,
        id: employee.id,
        image: employee.image,
        lastName: employee.lastName,
        reportsTo: employee.reportsTo,
      })
      .from(employee)
      .where(and(...conditions));

    return this.buildTree(allEmployees, null);
  }

  private buildTree(
    employees: {
      designation: string;
      firstName: string;
      id: string;
      image: string | null;
      lastName: string;
      reportsTo: string | null;
    }[],
    parentId: string | null,
  ): EmployeeTreeNode[] {
    return employees
      .filter((e) => e.reportsTo === parentId)
      .map((e) => ({
        children: this.buildTree(employees, e.id),
        designation: e.designation,
        id: e.id,
        image: e.image,
        name: `${e.firstName} ${e.lastName}`.trim(),
      }));
  }

  private async ensureEmployeeIdUnique(
    employeeId: string,
    excludeId?: string,
  ): Promise<void> {
    const conditions = [eq(employee.employeeId, employeeId)];
    if (excludeId) {
      conditions.push(sql`${employee.id} != ${excludeId}`);
    }

    const [existing] = await this.db
      .select({ id: employee.id })
      .from(employee)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new Error(`Employee ID "${employeeId}" already exists.`);
    }
  }

  // ─── Employee Group ──────────────────────────────────────────────────────

  async createGroup(input: CreateEmployeeGroupInput) {
    const parsed = parse(CreateEmployeeGroupSchema, input);

    const [result] = await this.db
      .insert(employeeGroup)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  }

  async updateGroup(id: string, patch: UpdateEmployeeGroupInput) {
    const parsed = parse(UpdateEmployeeGroupSchema, patch);

    const [updated] = await this.db
      .update(employeeGroup)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeGroup.id, id))
      .returning();

    return updated;
  }

  async getGroupById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeGroup)
      .where(eq(employeeGroup.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Employee group with id "${id}" not found.`);
    }

    return result;
  }

  async listGroups() {
    return this.db.select().from(employeeGroup);
  }

  async deleteGroup(id: string) {
    // Remove all members first
    await this.db
      .delete(employeeGroupMember)
      .where(eq(employeeGroupMember.groupId, id));

    const [deleted] = await this.db
      .delete(employeeGroup)
      .where(eq(employeeGroup.id, id))
      .returning();

    return deleted;
  }

  async addGroupMember(input: AddGroupMemberInput) {
    const parsed = parse(AddGroupMemberSchema, input);

    // Verify employee exists
    await this.getById(parsed.employeeId);

    // Verify group exists
    await this.getGroupById(parsed.groupId);

    // Check if already a member
    const [existing] = await this.db
      .select()
      .from(employeeGroupMember)
      .where(
        and(
          eq(employeeGroupMember.groupId, parsed.groupId),
          eq(employeeGroupMember.employeeId, parsed.employeeId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("Employee is already a member of this group.");
    }

    const [result] = await this.db
      .insert(employeeGroupMember)
      .values({
        employeeId: parsed.employeeId,
        groupId: parsed.groupId,
      })
      .returning();

    return result;
  }

  async removeGroupMember(groupId: string, employeeId: string) {
    const [deleted] = await this.db
      .delete(employeeGroupMember)
      .where(
        and(
          eq(employeeGroupMember.groupId, groupId),
          eq(employeeGroupMember.employeeId, employeeId),
        ),
      )
      .returning();

    return deleted;
  }

  async listGroupMembers(groupId: string) {
    return this.db
      .select()
      .from(employeeGroupMember)
      .where(eq(employeeGroupMember.groupId, groupId));
  }

  // ─── Employee Health Insurance ───────────────────────────────────────────

  async createHealthInsurance(input: CreateHealthInsuranceInput) {
    const parsed = parse(CreateHealthInsuranceSchema, input);

    // Verify employee exists
    await this.getById(parsed.employeeId);

    const [result] = await this.db
      .insert(employeeHealthInsurance)
      .values({
        coverageDetails: parsed.coverageDetails ?? null,
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        insurer: parsed.insurer,
        metadata: parsed.metadata ?? null,
        policyNumber: parsed.policyNumber,
        premiumAmount: parsed.premiumAmount ?? null,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  }

  async updateHealthInsurance(id: string, patch: UpdateHealthInsuranceInput) {
    const parsed = parse(UpdateHealthInsuranceSchema, patch);

    const [updated] = await this.db
      .update(employeeHealthInsurance)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeHealthInsurance.id, id))
      .returning();

    return updated;
  }

  async getHealthInsuranceById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Health insurance with id "${id}" not found.`);
    }

    return result;
  }

  async listHealthInsuranceByEmployee(employeeId: string) {
    return this.db
      .select()
      .from(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.employeeId, employeeId));
  }

  async deleteHealthInsurance(id: string) {
    const [deleted] = await this.db
      .delete(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.id, id))
      .returning();

    return deleted;
  }

  // ─── Employee Skill Map ──────────────────────────────────────────────────

  async createSkillMap(input: CreateSkillMapInput) {
    const parsed = parse(CreateSkillMapSchema, input);

    // Verify employee exists
    await this.getById(parsed.employeeId);

    const [result] = await this.db
      .insert(employeeSkillMap)
      .values({
        assessedBy: parsed.assessedBy ?? null,
        assessmentDate: parsed.assessmentDate ?? null,
        certificationDate: parsed.certificationDate ?? null,
        certificationName: parsed.certificationName ?? null,
        employeeId: parsed.employeeId,
        expiryDate: parsed.expiryDate ?? null,
        notes: parsed.notes ?? null,
        proficiency: parsed.proficiency,
        skill: parsed.skill,
      })
      .returning();

    return result;
  }

  async updateSkillMap(id: string, patch: UpdateSkillMapInput) {
    const parsed = parse(UpdateSkillMapSchema, patch);

    const [updated] = await this.db
      .update(employeeSkillMap)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeSkillMap.id, id))
      .returning();

    return updated;
  }

  async getSkillMapById(id: string) {
    const [result] = await this.db
      .select()
      .from(employeeSkillMap)
      .where(eq(employeeSkillMap.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Skill map with id "${id}" not found.`);
    }

    return result;
  }

  async listSkillMapByEmployee(employeeId: string) {
    return this.db
      .select()
      .from(employeeSkillMap)
      .where(eq(employeeSkillMap.employeeId, employeeId));
  }

  async deleteSkillMap(id: string) {
    const [deleted] = await this.db
      .delete(employeeSkillMap)
      .where(eq(employeeSkillMap.id, id))
      .returning();

    return deleted;
  }
}
