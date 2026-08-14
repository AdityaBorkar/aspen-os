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
  ItemGranteeTypeSchema,
  ItemPermissionSchema,
  ItemTypeSchema,
} from "./item-enums";

export const CreateItemShareSchema = object({
  expiresAt: optional(nullable(date())),
  granteeId: pipe(string(), minLength(1, "granteeId is required")),
  granteeType: ItemGranteeTypeSchema,
  itemId: pipe(string(), minLength(1, "itemId is required")),
  itemType: ItemTypeSchema,
  message: optional(nullable(string())),
  permission: ItemPermissionSchema,
  sharedBy: pipe(string(), minLength(1, "sharedBy is required")),
});

export type CreateItemShareInput = InferOutput<typeof CreateItemShareSchema>;

export const UpdateItemShareSchema = object({
  permission: ItemPermissionSchema,
});

export type UpdateItemShareInput = InferOutput<typeof UpdateItemShareSchema>;

export const ListSharedWithMeOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
});

export type ListSharedWithMeOptions = InferOutput<
  typeof ListSharedWithMeOptionsSchema
>;
