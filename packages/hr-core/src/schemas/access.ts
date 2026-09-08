import { AccessLevelSchema, PermissionActionSchema } from "#/schemas/enums";
import { EmployeeIdSchema, NameSchema, OptionalStringSchema } from "#/schemas/utils";

import { boolean, minLength, object, omit, optional, partial, pick, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

// HR User

export const CreateHrUserSchema = object({
  employeeId: EmployeeIdSchema,
  isActive: optional(boolean(), true),
  userId: pipe(string(), minLength(1, "User ID is required")),
});

export type CreateHrUserInput = InferOutput<typeof CreateHrUserSchema>;

export const UpdateHrUserSchema = object({
  ...partial(omit(CreateHrUserSchema, ["employeeId", "userId"])).entries,
  isActive: optional(boolean()),
});

export type UpdateHrUserInput = InferOutput<typeof UpdateHrUserSchema>;

export const HrUserFiltersSchema = object({
  ...partial(pick(CreateHrUserSchema, ["employeeId"])).entries,
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
  ...partial(omit(CreateHrRoleSchema, ["isSystem", "name"])).entries,
  isActive: optional(boolean()),
});

export type UpdateHrRoleInput = InferOutput<typeof UpdateHrRoleSchema>;

// Kept explicit: picking the defaulted isActive/isSystem flags would inherit
// their create-time defaults into filter semantics.
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

export type CreateHrPermissionInput = InferOutput<typeof CreateHrPermissionSchema>;

export const HrPermissionFiltersSchema = object({
  ...partial(pick(CreateHrPermissionSchema, ["action", "module"])).entries,
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

export type GrantBranchAccessInput = InferOutput<typeof GrantBranchAccessSchema>;

export const UpdateBranchAccessSchema = object({
  accessLevel: optional(AccessLevelSchema),
});

export type UpdateBranchAccessInput = InferOutput<typeof UpdateBranchAccessSchema>;
