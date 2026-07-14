import {
  boolean,
  type InferOutput,
  minLength,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { AccessLevelSchema, PermissionActionSchema } from "./enums";
import { EmployeeIdSchema, NameSchema, OptionalStringSchema } from "./utils";

// HR User

export const CreateHrUserSchema = object({
  employeeId: EmployeeIdSchema,
  isActive: optional(boolean(), true),
  userId: pipe(string(), minLength(1, "User ID is required")),
});

export type CreateHrUserInput = InferOutput<typeof CreateHrUserSchema>;

export const UpdateHrUserSchema = object({
  isActive: optional(boolean()),
});

export type UpdateHrUserInput = InferOutput<typeof UpdateHrUserSchema>;

export const HrUserFiltersSchema = object({
  employeeId: optional(string()),
  isActive: optional(boolean()),
  userId: optional(string()),
});

export type HrUserFilters = InferOutput<typeof HrUserFiltersSchema>;

// Role

export const CreateHrRoleSchema = object({
  description: OptionalStringSchema,
  isActive: optional(boolean(), true),
  isSystem: optional(boolean(), false),
  name: NameSchema,
});

export type CreateHrRoleInput = InferOutput<typeof CreateHrRoleSchema>;

export const UpdateHrRoleSchema = object({
  description: OptionalStringSchema,
  isActive: optional(boolean()),
});

export type UpdateHrRoleInput = InferOutput<typeof UpdateHrRoleSchema>;

export const HrRoleFiltersSchema = object({
  isActive: optional(boolean()),
  isSystem: optional(boolean()),
  name: optional(string()),
});

export type HrRoleFilters = InferOutput<typeof HrRoleFiltersSchema>;

// Permission

export const CreateHrPermissionSchema = object({
  action: PermissionActionSchema,
  description: OptionalStringSchema,
  module: pipe(string(), minLength(1, "Module is required")),
});

export type CreateHrPermissionInput = InferOutput<
  typeof CreateHrPermissionSchema
>;

export const HrPermissionFiltersSchema = object({
  action: optional(PermissionActionSchema),
  module: optional(string()),
});

export type HrPermissionFilters = InferOutput<typeof HrPermissionFiltersSchema>;

// Role-Permission Mapping

export const AssignPermissionSchema = object({
  permissionId: pipe(string(), minLength(1, "Permission ID is required")),
  roleId: pipe(string(), minLength(1, "Role ID is required")),
});

export type AssignPermissionInput = InferOutput<typeof AssignPermissionSchema>;

// User-Role Assignment (Canvas-like context roles with branch scope)

export const AssignRoleSchema = object({
  branchId: OptionalStringSchema,
  hrUserId: pipe(string(), minLength(1, "HR User ID is required")),
  roleId: pipe(string(), minLength(1, "Role ID is required")),
});

export type AssignRoleInput = InferOutput<typeof AssignRoleSchema>;

// Branch Access

export const GrantBranchAccessSchema = object({
  accessLevel: optional(AccessLevelSchema, "read_only"),
  branchId: pipe(string(), minLength(1, "Branch ID is required")),
  hrUserId: pipe(string(), minLength(1, "HR User ID is required")),
});

export type GrantBranchAccessInput = InferOutput<
  typeof GrantBranchAccessSchema
>;

export const UpdateBranchAccessSchema = object({
  accessLevel: optional(AccessLevelSchema),
});

export type UpdateBranchAccessInput = InferOutput<
  typeof UpdateBranchAccessSchema
>;
