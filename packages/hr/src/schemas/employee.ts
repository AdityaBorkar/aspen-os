import {
  EmployeeStatusSchema,
  EmploymentTypeSchema,
  GenderSchema,
  SkillProficiencySchema,
} from "#/schemas/enums";
import { EmployeeIdSchema, NameSchema } from "#/schemas/utils";

import {
  boolean,
  minLength,
  nullable,
  object,
  omit,
  optional,
  partial,
  pick,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

// Employee

export const CreateEmployeeSchema = object({
  bankAccountNumber: optional(nullable(string())),
  bankBranch: optional(nullable(string())),
  bankName: optional(nullable(string())),
  bloodGroup: optional(nullable(string())),
  branch: optional(nullable(string())),
  city: optional(nullable(string())),
  company: pipe(string(), minLength(1, "Company is required")),
  country: optional(nullable(string())),
  currentAddress: optional(nullable(string())),
  dateOfBirth: optional(string()),
  dateOfJoining: pipe(string(), minLength(1, "Date of joining is required")),
  dateOfLeaving: optional(string()),
  department: pipe(string(), minLength(1, "Department is required")),
  designation: pipe(string(), minLength(1, "Designation is required")),
  email: optional(nullable(string())),
  emergencyContactName: optional(nullable(string())),
  emergencyContactPhone: optional(nullable(string())),
  emergencyContactRelation: optional(nullable(string())),
  employeeId: EmployeeIdSchema,
  employmentType: EmploymentTypeSchema,
  firstName: NameSchema,
  gender: optional(GenderSchema),
  grade: optional(nullable(string())),
  holidayList: optional(nullable(string())),
  ifscCode: optional(nullable(string())),
  image: optional(nullable(string())),
  lastName: NameSchema,
  maritalStatus: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  middleName: optional(nullable(string())),
  permanentAddress: optional(nullable(string())),
  personalEmail: optional(nullable(string())),
  personalPhone: optional(nullable(string())),
  phone: optional(nullable(string())),
  postalCode: optional(nullable(string())),
  reportsTo: optional(nullable(string())),
  salaryStructureAssignment: optional(nullable(string())),
  socialSecurityNumber: optional(nullable(string())),
  state: optional(nullable(string())),
  taxId: optional(nullable(string())),
  workEmail: optional(nullable(string())),
  workPhone: optional(nullable(string())),
});

export type CreateEmployeeInput = InferOutput<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = object({
  ...partial(CreateEmployeeSchema).entries,
  status: optional(EmployeeStatusSchema),
});

export type UpdateEmployeeInput = InferOutput<typeof UpdateEmployeeSchema>;

export const EmployeeFiltersSchema = object({
  ...partial(
    pick(CreateEmployeeSchema, [
      "branch",
      "company",
      "department",
      "designation",
      "employmentType",
      "grade",
      "reportsTo",
    ]),
  ).entries,
  status: optional(EmployeeStatusSchema),
});

export type EmployeeFilters = InferOutput<typeof EmployeeFiltersSchema>;

// Employee Group

export const CreateEmployeeGroupSchema = object({
  description: optional(nullable(string())),
  name: NameSchema,
});

export type CreateEmployeeGroupInput = InferOutput<typeof CreateEmployeeGroupSchema>;

export const UpdateEmployeeGroupSchema = object({
  ...partial(CreateEmployeeGroupSchema).entries,
  isActive: optional(boolean()),
});

export type UpdateEmployeeGroupInput = InferOutput<typeof UpdateEmployeeGroupSchema>;

// Employee Group Member

export const AddGroupMemberSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  groupId: pipe(string(), minLength(1, "Group ID is required")),
});

export type AddGroupMemberInput = InferOutput<typeof AddGroupMemberSchema>;

// Employee Health Insurance

export const CreateHealthInsuranceSchema = object({
  coverageDetails: optional(nullable(string())),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  endDate: optional(string()),
  insurer: pipe(string(), minLength(1, "Insurer is required")),
  metadata: optional(nullable(object({}))),
  policyNumber: pipe(string(), minLength(1, "Policy number is required")),
  premiumAmount: optional(nullable(string())),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateHealthInsuranceInput = InferOutput<typeof CreateHealthInsuranceSchema>;

export const UpdateHealthInsuranceSchema = object({
  ...partial(omit(CreateHealthInsuranceSchema, ["employeeId"])).entries,
  isActive: optional(boolean()),
});

export type UpdateHealthInsuranceInput = InferOutput<typeof UpdateHealthInsuranceSchema>;

// Employee Skill Map

export const CreateSkillMapSchema = object({
  assessedBy: optional(nullable(string())),
  assessmentDate: optional(string()),
  certificationDate: optional(string()),
  certificationName: optional(nullable(string())),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  expiryDate: optional(string()),
  notes: optional(nullable(string())),
  proficiency: SkillProficiencySchema,
  skill: pipe(string(), minLength(1, "Skill is required")),
});

export type CreateSkillMapInput = InferOutput<typeof CreateSkillMapSchema>;

export const UpdateSkillMapSchema = partial(omit(CreateSkillMapSchema, ["employeeId"]));

export type UpdateSkillMapInput = InferOutput<typeof UpdateSkillMapSchema>;
