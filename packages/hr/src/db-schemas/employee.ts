import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import {
  checkinLogTypeEnum,
  employeeStatusEnum,
  employmentTypeEnum,
  genderEnum,
  onboardingStatusEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} from "./enums";

export const employee = pgTable(
  "employee",
  {
    bankAccountNumber: text("bank_account_number"),
    bankBranch: text("bank_branch"),
    bankName: text("bank_name"),
    bloodGroup: text("blood_group"),
    branch: text("branch"),
    city: text("city"),
    company: text("company").notNull(),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentAddress: text("current_address"),
    dateOfBirth: date("date_of_birth"),
    dateOfJoining: date("date_of_joining").notNull(),
    dateOfLeaving: date("date_of_leaving"),
    department: text("department").notNull(),
    designation: text("designation").notNull(),
    email: text("email"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),
    employeeId: text("employee_id").notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    firstName: text("first_name").notNull(),
    gender: genderEnum("gender"),
    grade: text("grade"),
    holidayList: text("holiday_list"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    ifscCode: text("ifsc_code"),
    image: text("image"),
    lastName: text("last_name").notNull(),
    maritalStatus: text("marital_status"),
    metadata: jsonb("metadata"),
    middleName: text("middle_name"),
    permanentAddress: text("permanent_address"),
    personalEmail: text("personal_email"),
    personalPhone: text("personal_phone"),
    phone: text("phone"),
    postalCode: text("postal_code"),
    reportsTo: text("reports_to"),
    salaryStructureAssignment: text("salary_structure_assignment"),
    socialSecurityNumber: text("social_security_number"),
    state: text("state"),
    status: employeeStatusEnum("status").notNull().default("active"),
    taxId: text("tax_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workEmail: text("work_email"),
    workPhone: text("work_phone"),
  },
  (table) => [
    index("idx_employee_employee_id").on(table.employeeId),
    index("idx_employee_company").on(table.company),
    index("idx_employee_status").on(table.status),
  ],
);

export const employeeGroup = pgTable("employee_group", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().$defaultFn(uuidv7),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employeeGroupMember = pgTable(
  "employee_group_member",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    groupId: text("group_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_group_member_group_id").on(table.groupId),
    index("idx_employee_group_member_employee_id").on(table.employeeId),
  ],
);

export const employeeHealthInsurance = pgTable(
  "employee_health_insurance",
  {
    coverageDetails: text("coverage_details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    endDate: date("end_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    insurer: text("insurer").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata"),
    policyNumber: text("policy_number").notNull(),
    premiumAmount: text("premium_amount"),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_health_insurance_employee_id").on(table.employeeId),
  ],
);

export const employeeSkillMap = pgTable(
  "employee_skill_map",
  {
    assessedBy: text("assessed_by"),
    assessmentDate: date("assessment_date"),
    certificationDate: date("certification_date"),
    certificationName: text("certification_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    expiryDate: date("expiry_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    notes: text("notes"),
    proficiency: skillProficiencyEnum("proficiency").notNull(),
    skill: text("skill").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_employee_skill_map_employee_id").on(table.employeeId)],
);

export const employeeCheckin = pgTable(
  "employee_checkin",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deviceId: text("device_id"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isOffShift: boolean("is_off_shift").notNull().default(false),
    latitude: text("latitude"),
    logType: checkinLogTypeEnum("log_type").notNull(),
    longitude: text("longitude"),
    metadata: jsonb("metadata"),
    shift: text("shift"),
    time: timestamp("time", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_employee_checkin_employee_id").on(table.employeeId)],
);

export const employeeOnboarding = pgTable(
  "employee_onboarding",
  {
    actualCompletionDate: date("actual_completion_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    expectedCompletionDate: date("expected_completion_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    startDate: date("start_date").notNull(),
    status: onboardingStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_onboarding_employee_id").on(table.employeeId),
    index("idx_employee_onboarding_status").on(table.status),
  ],
);

export const employeePromotion = pgTable(
  "employee_promotion",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentDepartment: text("current_department"),
    currentDesignation: text("current_designation").notNull(),
    currentGrade: text("current_grade"),
    effectiveDate: date("effective_date").notNull(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    newDepartment: text("new_department"),
    newDesignation: text("new_designation").notNull(),
    newGrade: text("new_grade"),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    salaryRevision: text("salary_revision"),
    status: promotionStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_promotion_employee_id").on(table.employeeId),
    index("idx_employee_promotion_status").on(table.status),
  ],
);

export const employeeSeparation = pgTable(
  "employee_separation",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    exitDate: date("exit_date").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    reason: text("reason"),
    resignationDate: date("resignation_date"),
    status: separationStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_separation_employee_id").on(table.employeeId),
    index("idx_employee_separation_status").on(table.status),
  ],
);

export const employeeTransfer = pgTable(
  "employee_transfer",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveDate: date("effective_date").notNull(),
    employeeId: text("employee_id").notNull(),
    fromBranch: text("from_branch"),
    fromCompany: text("from_company"),
    fromDepartment: text("from_department"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: transferStatusEnum("status").notNull().default("pending"),
    toBranch: text("to_branch"),
    toCompany: text("to_company"),
    toDepartment: text("to_department"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_employee_transfer_employee_id").on(table.employeeId),
    index("idx_employee_transfer_status").on(table.status),
  ],
);
