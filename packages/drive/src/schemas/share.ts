import {
  date,
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import {
  DriveGranteeTypeSchema,
  DriveItemTypeSchema,
  DrivePermissionSchema,
} from "./enums";

export const CreateShareSchema = object({
  expiresAt: optional(nullable(date())),
  granteeId: pipe(string(), minLength(1, "granteeId is required")),
  granteeType: DriveGranteeTypeSchema,
  itemId: pipe(string(), minLength(1, "itemId is required")),
  itemType: DriveItemTypeSchema,
  message: optional(nullable(string())),
  permission: DrivePermissionSchema,
  sharedBy: pipe(string(), minLength(1, "sharedBy is required")),
});

export type CreateShareInput = InferOutput<typeof CreateShareSchema>;

export const UpdateShareSchema = object({
  permission: DrivePermissionSchema,
});

export type UpdateShareInput = InferOutput<typeof UpdateShareSchema>;

export const ListSharedWithMeOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
});

export type ListSharedWithMeOptions = InferOutput<
  typeof ListSharedWithMeOptionsSchema
>;
