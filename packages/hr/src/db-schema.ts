import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────────

export const employeeStatusEnum = pgEnum("hr_employee_status", [
  "active",
  "inactive",
  "left",
  "suspended",
]);

export const genderEnum = pgEnum("hr_gender", [
  "female",
  "male",
  "other",
  "prefer_not_to_say",
]);

export const employmentTypeEnum = pgEnum("hr_employment_type", [
  "contract",
  "freelance",
  "intern",
  "part_time",
  "permanent",
  "temporary",
]);

export const attendanceStatusEnum = pgEnum("hr_attendance_status", [
  "absent",
  "half_day",
  "on_leave",
  "present",
  "work_from_home",
]);

export const checkinLogTypeEnum = pgEnum("hr_checkin_log_type", ["in", "out"]);

export const attendanceRequestStatusEnum = pgEnum(
  "hr_attendance_request_status",
  ["approved", "pending", "rejected"],
);

export const shiftRequestStatusEnum = pgEnum("hr_shift_request_status", [
  "approved",
  "pending",
  "rejected",
]);

export const shiftAssignmentStatusEnum = pgEnum("hr_shift_assignment_status", [
  "active",
  "completed",
  "inactive",
]);

export const leaveApplicationStatusEnum = pgEnum(
  "hr_leave_application_status",
  ["approved", "cancelled", "draft", "pending", "rejected"],
);

export const leaveAllocationStatusEnum = pgEnum("hr_leave_allocation_status", [
  "active",
  "cancelled",
  "expired",
]);

export const compensatoryLeaveStatusEnum = pgEnum(
  "hr_compensatory_leave_status",
  ["approved", "pending", "rejected"],
);

export const leaveEncashmentStatusEnum = pgEnum("hr_leave_encashment_status", [
  "approved",
  "paid",
  "pending",
  "rejected",
]);

export const lifecycleTaskStatusEnum = pgEnum("hr_lifecycle_task_status", [
  "completed",
  "in_progress",
  "pending",
  "skipped",
]);

export const onboardingStatusEnum = pgEnum("hr_onboarding_status", [
  "cancelled",
  "completed",
  "in_progress",
  "pending",
]);

export const separationStatusEnum = pgEnum("hr_separation_status", [
  "cancelled",
  "completed",
  "in_progress",
  "pending",
]);

export const promotionStatusEnum = pgEnum("hr_promotion_status", [
  "approved",
  "completed",
  "pending",
  "rejected",
]);

export const transferStatusEnum = pgEnum("hr_transfer_status", [
  "approved",
  "completed",
  "pending",
  "rejected",
]);

export const skillProficiencyEnum = pgEnum("hr_skill_proficiency", [
  "advanced",
  "beginner",
  "expert",
  "intermediate",
]);

export const overtimeStatusEnum = pgEnum("hr_overtime_status", [
  "approved",
  "pending",
  "rejected",
]);

export const exitInterviewStatusEnum = pgEnum("hr_exit_interview_status", [
  "cancelled",
  "completed",
  "scheduled",
]);

export const fullAndFinalStatusEnum = pgEnum("hr_full_and_final_status", [
  "approved",
  "cancelled",
  "draft",
  "paid",
  "pending",
]);

export const holidayTypeEnum = pgEnum("hr_holiday_type", [
  "company",
  "optional",
  "public",
  "weekly_off",
]);

export const earnedLeaveFrequencyEnum = pgEnum("hr_earned_leave_frequency", [
  "half_yearly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const leaveBlockListScopeEnum = pgEnum("hr_leave_block_list_scope", [
  "company",
  "department",
]);

export const accessLevelEnum = pgEnum("hr_access_level", [
  "full",
  "manage",
  "read_only",
]);

export const permissionActionEnum = pgEnum("hr_permission_action", [
  "approve",
  "create",
  "delete",
  "manage",
  "reject",
  "update",
  "view",
]);

// ─── Attendance Tables ─────────────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    attendanceRequest: text("attendance_request"),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    date: date("date").notNull(),
    earlyExit: boolean("early_exit").notNull().default(false),
    earlyExitMinutes: integer("early_exit_minutes").notNull().default(0),
    employeeId: text("employee_id").notNull(),
    halfDayType: text("half_day_type"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isHalfDay: boolean("is_half_day").notNull().default(false),
    lateEntry: boolean("late_entry").notNull().default(false),
    lateEntryMinutes: integer("late_entry_minutes").notNull().default(0),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    shift: text("shift"),
    status: attendanceStatusEnum("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workingHours: text("working_hours"),
  },
  (table) => [
    index("idx_attendance_employee_id").on(table.employeeId),
    index("idx_attendance_date").on(table.date),
  ],
);

export const employeeCheckin = pgTable(
  "employee_checkin",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deviceId: text("device_id"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const attendanceRequest = pgTable(
  "attendance_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    reason: text("reason").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: attendanceRequestStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_attendance_request_employee_id").on(table.employeeId),
    index("idx_attendance_request_status").on(table.status),
  ],
);

// ─── Employee Tables ──────────────────────────────────────────────────────

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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    notes: text("notes"),
    proficiency: skillProficiencyEnum("proficiency").notNull(),
    skill: text("skill").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_employee_skill_map_employee_id").on(table.employeeId)],
);

// ─── Leave Tables ─────────────────────────────────────────────────────────

export const leaveType = pgTable(
  "leave_type",
  {
    allowNegativeBalance: boolean("allow_negative_balance")
      .notNull()
      .default(false),
    applicableAfterWorkingDays: integer("applicable_after_working_days")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    earnedLeaveFrequency: earnedLeaveFrequencyEnum("earned_leave_frequency"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    includeHolidaysWithinLeaves: boolean("include_holidays_within_leaves")
      .notNull()
      .default(false),
    isActive: boolean("is_active").notNull().default(true),
    isCarryForward: boolean("is_carry_forward").notNull().default(false),
    isEarnedLeave: boolean("is_earned_leave").notNull().default(false),
    isLeaveWithoutPay: boolean("is_leave_without_pay").notNull().default(false),
    isPartiallyPaid: boolean("is_partially_paid").notNull().default(false),
    maxCarryForwardDays: integer("max_carry_forward_days"),
    maxContinuousDaysAllowed: integer("max_continuous_days_allowed"),
    maxDaysAllowed: integer("max_days_allowed").notNull(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_leave_type_is_active").on(table.isActive)],
);

export const leavePeriod = pgTable(
  "leave_period",
  {
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: date("end_date").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_leave_period_is_active").on(table.isActive)],
);

export const leavePolicy = pgTable("leave_policy", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leavePolicyDetail = pgTable(
  "leave_policy_detail",
  {
    carryForwardDays: integer("carry_forward_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leavePolicyId: text("leave_policy_id").notNull(),
    leaveType: text("leave_type").notNull(),
    maxDays: integer("max_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leave_policy_detail_leave_policy_id").on(table.leavePolicyId),
  ],
);

export const leavePolicyAssignment = pgTable(
  "leave_policy_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    leavePeriod: text("leave_period").notNull(),
    leavePolicy: text("leave_policy").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leave_policy_assignment_employee_id").on(table.employeeId),
    index("idx_leave_policy_assignment_leave_policy").on(table.leavePolicy),
    index("idx_leave_policy_assignment_leave_period").on(table.leavePeriod),
  ],
);

export const leaveAllocation = pgTable(
  "leave_allocation",
  {
    carryForwardedDays: numeric("carry_forwarded_days").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    earnedDays: numeric("earned_days").notNull().default("0"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leavePeriod: text("leave_period").notNull(),
    leavePolicyAssignment: text("leave_policy_assignment"),
    leaveType: text("leave_type").notNull(),
    status: leaveAllocationStatusEnum("status").notNull().default("active"),
    totalDays: numeric("total_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedDays: numeric("used_days").notNull().default("0"),
  },
  (table) => [
    index("idx_leave_allocation_employee_id").on(table.employeeId),
    index("idx_leave_allocation_leave_type").on(table.leaveType),
    index("idx_leave_allocation_status").on(table.status),
  ],
);

export const leaveApplication = pgTable(
  "leave_application",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    halfDayDate: date("half_day_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isHalfDay: boolean("is_half_day").notNull().default(false),
    leaveAllocation: text("leave_allocation"),
    leaveType: text("leave_type").notNull(),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: leaveApplicationStatusEnum("status").notNull().default("draft"),
    toDate: date("to_date").notNull(),
    totalDays: numeric("total_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leave_application_employee_id").on(table.employeeId),
    index("idx_leave_application_status").on(table.status),
  ],
);

export const compensatoryLeaveRequest = pgTable(
  "compensatory_leave_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leaveAllocation: text("leave_allocation"),
    leaveType: text("leave_type").notNull(),
    numberOfDays: numeric("number_of_days").notNull().default("1"),
    reason: text("reason").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: compensatoryLeaveStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workDate: date("work_date").notNull(),
  },
  (table) => [
    index("idx_compensatory_leave_request_employee_id").on(table.employeeId),
    index("idx_compensatory_leave_request_status").on(table.status),
  ],
);

export const leaveEncashment = pgTable(
  "leave_encashment",
  {
    amount: numeric("amount"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    encashableDays: numeric("encashable_days").notNull(),
    encashedDays: numeric("encashed_days").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leavePeriod: text("leave_period").notNull(),
    leaveType: text("leave_type").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: leaveEncashmentStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leave_encashment_employee_id").on(table.employeeId),
    index("idx_leave_encashment_status").on(table.status),
  ],
);

export const leaveBlockList = pgTable(
  "leave_block_list",
  {
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    department: text("department"),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    reason: text("reason"),
    scope: leaveBlockListScopeEnum("scope").notNull(),
    toDate: date("to_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_leave_block_list_is_active").on(table.isActive)],
);

export const leaveAdjustment = pgTable(
  "leave_adjustment",
  {
    adjustedBy: text("adjusted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    days: numeric("days").notNull(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leaveLedgerEntry: text("leave_ledger_entry").notNull(),
    leavePeriod: text("leave_period"),
    leaveType: text("leave_type").notNull(),
    reason: text("reason").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_leave_adjustment_employee_id").on(table.employeeId)],
);

export const leaveLedgerEntry = pgTable(
  "leave_ledger_entry",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    days: numeric("days").notNull(),
    description: text("description").notNull(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leaveApplication: text("leave_application"),
    leaveType: text("leave_type").notNull(),
    transactionType: text("transaction_type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leave_ledger_entry_employee_id").on(table.employeeId),
    index("idx_leave_ledger_entry_leave_type").on(table.leaveType),
  ],
);

// ─── Lifecycle Tables ─────────────────────────────────────────────────────

export const employeeOnboarding = pgTable(
  "employee_onboarding",
  {
    actualCompletionDate: date("actual_completion_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    expectedCompletionDate: date("expected_completion_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const onboardingTask = pgTable(
  "onboarding_task",
  {
    assignedTo: text("assigned_to"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    department: text("department"),
    description: text("description"),
    dueDate: date("due_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    notes: text("notes"),
    onboardingId: text("onboarding_id").notNull(),
    status: lifecycleTaskStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_onboarding_task_onboarding_id").on(table.onboardingId),
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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const employeeSeparation = pgTable(
  "employee_separation",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    exitDate: date("exit_date").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const separationTask = pgTable(
  "separation_task",
  {
    assignedTo: text("assigned_to"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    department: text("department"),
    description: text("description"),
    dueDate: date("due_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    notes: text("notes"),
    separationId: text("separation_id").notNull(),
    status: lifecycleTaskStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_separation_task_separation_id").on(table.separationId),
  ],
);

export const exitInterview = pgTable(
  "exit_interview",
  {
    completedDate: timestamp("completed_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    feedback: text("feedback"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    interviewer: text("interviewer"),
    questionnaireTemplate: text("questionnaire_template"),
    responses: jsonb("responses"),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    separationId: text("separation_id"),
    status: exitInterviewStatusEnum("status").notNull().default("scheduled"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_exit_interview_employee_id").on(table.employeeId),
    index("idx_exit_interview_status").on(table.status),
  ],
);

export const fullAndFinalStatement = pgTable(
  "full_and_final_statement",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    bonus: numeric("bonus").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deductions: numeric("deductions").notNull().default("0"),
    employeeId: text("employee_id").notNull(),
    gratuity: numeric("gratuity").notNull().default("0"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    leaveEncashment: numeric("leave_encashment").notNull().default("0"),
    loanRecovery: numeric("loan_recovery").notNull().default("0"),
    metadata: jsonb("metadata"),
    netPayable: numeric("net_payable"),
    notes: text("notes"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentEntry: text("payment_entry"),
    pendingSalary: numeric("pending_salary").notNull().default("0"),
    separationId: text("separation_id"),
    status: fullAndFinalStatusEnum("status").notNull().default("draft"),
    totalDeductions: numeric("total_deductions"),
    totalEarnings: numeric("total_earnings"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_full_and_final_statement_employee_id").on(table.employeeId),
    index("idx_full_and_final_statement_status").on(table.status),
  ],
);

// ─── Overtime Tables ─────────────────────────────────────────────────────

export const overtimeType = pgTable(
  "overtime_type",
  {
    amountCalculation: text("amount_calculation").notNull().default("fixed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    fixedHourlyRate: numeric("fixed_hourly_rate"),
    holidayMultiplier: numeric("holiday_multiplier").notNull().default("2"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    maxOvertimeHoursPerDay: numeric("max_overtime_hours_per_day"),
    name: text("name").notNull(),
    overtimeSalaryComponent: text("overtime_salary_component"),
    standardMultiplier: numeric("standard_multiplier").notNull().default("1.5"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    weekendMultiplier: numeric("weekend_multiplier").notNull().default("2"),
  },
  (table) => [index("idx_overtime_type_is_active").on(table.isActive)],
);

export const overtimeSlip = pgTable(
  "overtime_slip",
  {
    amount: numeric("amount"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    holidayHours: numeric("holiday_hours").notNull().default("0"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    overtimeType: text("overtime_type").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    standardHours: numeric("standard_hours").notNull().default("0"),
    status: overtimeStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date").notNull(),
    totalOvertimeHours: numeric("total_overtime_hours").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    weekendHours: numeric("weekend_hours").notNull().default("0"),
  },
  (table) => [
    index("idx_overtime_slip_employee_id").on(table.employeeId),
    index("idx_overtime_slip_status").on(table.status),
  ],
);

// ─── Setup Tables ─────────────────────────────────────────────────────────

export const hrSettings = pgTable("hr_settings", {
  allowMultipleShiftAssignments: boolean("allow_multiple_shift_assignments"),
  autoAttendance: boolean("auto_attendance"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  defaultHolidayList: text("default_holiday_list"),
  employeeNamingSeries: text("employee_naming_series"),
  expenseClaimDefault: text("expense_claim_default"),
  geolocationTracking: boolean("geolocation_tracking"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  leaveApprovalWorkflow: text("leave_approval_workflow"),
  leaveWithoutPayHandling: text("leave_without_pay_handling"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payrollSettings = pgTable("payroll_settings", {
  benefitsApplicationMandatory: boolean("benefits_application_mandatory"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fiscalYearEnd: text("fiscal_year_end"),
  fiscalYearStart: text("fiscal_year_start"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  incomeTaxComponent: text("income_tax_component"),
  multiCurrencyExpenseClaims: boolean("multi_currency_expense_claims"),
  payrollPeriodEnd: text("payroll_period_end"),
  payrollPeriodStart: text("payroll_period_start"),
  rounding: text("rounding"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employmentType = pgTable(
  "employment_type",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_employment_type_is_active").on(table.isActive)],
);

export const department = pgTable(
  "department",
  {
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    manager: text("manager"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    parentDepartment: text("parent_department"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_department_is_active").on(table.isActive),
    index("idx_department_parent_department").on(table.parentDepartment),
  ],
);

export const designation = pgTable("designation", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employeeGrade = pgTable("employee_grade", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  defaultSalaryStructure: text("default_salary_structure"),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const holidayList = pgTable("holiday_list", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  weeklyOffDays: jsonb("weekly_off_days"),
  year: integer("year").notNull(),
});

export const holiday = pgTable(
  "holiday",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    date: date("date").notNull(),
    description: text("description"),
    holidayListId: text("holiday_list_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    name: text("name").notNull(),
    type: holidayTypeEnum("type").notNull().default("public"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_holiday_holiday_list_id").on(table.holidayListId)],
);

// ─── Shift Tables ─────────────────────────────────────────────────────────

export const shiftType = pgTable(
  "shift_type",
  {
    allowCheckOutAfterEnd: integer("allow_check_out_after_end")
      .notNull()
      .default(0),
    allowOvertime: boolean("allow_overtime").notNull().default(false),
    beginCheckInBeforeStart: integer("begin_check_in_before_start")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    determineCheckInBy: text("determine_check_in_by"),
    earlyExitGraceMinutes: integer("early_exit_grace_minutes")
      .notNull()
      .default(0),
    enableAutoAttendance: boolean("enable_auto_attendance")
      .notNull()
      .default(false),
    enableAutoUpdateSync: boolean("enable_auto_update_sync")
      .notNull()
      .default(false),
    endTime: text("end_time").notNull(),
    holidayList: text("holiday_list"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    lateEntryGraceMinutes: integer("late_entry_grace_minutes")
      .notNull()
      .default(0),
    markAttendanceOnHolidays: boolean("mark_attendance_on_holidays")
      .notNull()
      .default(false),
    name: text("name").notNull(),
    overtimeType: text("overtime_type"),
    processAttendanceAfter: text("process_attendance_after"),
    startTime: text("start_time").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workingHoursCalculation: text("working_hours_calculation"),
    workingHoursThresholdForAbsent: text("working_hours_threshold_for_absent"),
    workingHoursThresholdForHalfDay: text(
      "working_hours_threshold_for_half_day",
    ),
  },
  (table) => [index("idx_shift_type_is_active").on(table.isActive)],
);

export const shiftLocation = pgTable("shift_location", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  name: text("name").notNull(),
  radius: integer("radius").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shiftAssignment = pgTable(
  "shift_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    endDate: date("end_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    notes: text("notes"),
    shiftLocation: text("shift_location"),
    shiftType: text("shift_type").notNull(),
    startDate: date("start_date").notNull(),
    status: shiftAssignmentStatusEnum("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_assignment_employee_id").on(table.employeeId),
    index("idx_shift_assignment_shift_type").on(table.shiftType),
    index("idx_shift_assignment_status").on(table.status),
  ],
);

export const shiftRequest = pgTable(
  "shift_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    shiftAssignment: text("shift_assignment"),
    shiftType: text("shift_type").notNull(),
    status: shiftRequestStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_request_employee_id").on(table.employeeId),
    index("idx_shift_request_status").on(table.status),
  ],
);

export const shiftSchedule = pgTable("shift_schedule", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  friday: boolean("friday").notNull().default(false),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  monday: boolean("monday").notNull().default(false),
  name: text("name").notNull(),
  saturday: boolean("saturday").notNull().default(false),
  shiftType: text("shift_type").notNull(),
  sunday: boolean("sunday").notNull().default(false),
  thursday: boolean("thursday").notNull().default(false),
  tuesday: boolean("tuesday").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  wednesday: boolean("wednesday").notNull().default(false),
});

export const shiftScheduleAssignment = pgTable(
  "shift_schedule_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    endDate: date("end_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    shiftSchedule: text("shift_schedule").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_schedule_assignment_employee_id").on(table.employeeId),
  ],
);

// ─── Access Control Tables ─────────────────────────────────────────────────

export const hrUser = pgTable(
  "hr_user",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_hr_user_employee_id").on(table.employeeId),
    index("idx_hr_user_user_id").on(table.userId),
  ],
);

export const hrRole = pgTable("hr_role", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const hrPermission = pgTable("hr_permission", {
  action: permissionActionEnum("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  module: text("module").notNull(),
});

export const hrRolePermission = pgTable(
  "hr_role_permission",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    permissionId: text("permission_id").notNull(),
    roleId: text("role_id").notNull(),
  },
  (table) => [
    index("idx_hr_role_permission_role_id").on(table.roleId),
    index("idx_hr_role_permission_permission_id").on(table.permissionId),
  ],
);

export const hrUserRole = pgTable(
  "hr_user_role",
  {
    branchId: text("branch_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hrUserId: text("hr_user_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    roleId: text("role_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_hr_user_role_hr_user_id").on(table.hrUserId),
    index("idx_hr_user_role_role_id").on(table.roleId),
    index("idx_hr_user_role_branch_id").on(table.branchId),
  ],
);

export const hrUserBranchAccess = pgTable(
  "hr_user_branch_access",
  {
    accessLevel: accessLevelEnum("access_level").notNull().default("read_only"),
    branchId: text("branch_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hrUserId: text("hr_user_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_hr_user_branch_access_hr_user_id").on(table.hrUserId),
    index("idx_hr_user_branch_access_branch_id").on(table.branchId),
  ],
);

// ─── Table Registry ────────────────────────────────────────────────────────

export const hrTables = {
  attendance,
  attendanceRequest,
  compensatoryLeaveRequest,
  department,
  designation,
  employee,
  employeeCheckin,
  employeeGrade,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
  employmentType,
  exitInterview,
  fullAndFinalStatement,
  holiday,
  holidayList,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
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
  onboardingTask,
  overtimeSlip,
  overtimeType,
  payrollSettings,
  separationTask,
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

export type HrUser = typeof hrUser.$inferSelect;
export type HrRole = typeof hrRole.$inferSelect;
export type HrPermission = typeof hrPermission.$inferSelect;
export type HrRolePermission = typeof hrRolePermission.$inferSelect;
export type HrUserRole = typeof hrUserRole.$inferSelect;
export type HrUserBranchAccess = typeof hrUserBranchAccess.$inferSelect;

export type NewHrUser = typeof hrUser.$inferInsert;
export type NewHrRole = typeof hrRole.$inferInsert;
export type NewHrPermission = typeof hrPermission.$inferInsert;
export type NewHrRolePermission = typeof hrRolePermission.$inferInsert;
export type NewHrUserRole = typeof hrUserRole.$inferInsert;
export type NewHrUserBranchAccess = typeof hrUserBranchAccess.$inferInsert;
