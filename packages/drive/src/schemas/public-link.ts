import {
  boolean,
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

import { DriveItemTypeSchema, DrivePublicLinkPermissionSchema } from "./enums";

export const CreatePublicLinkSchema = object({
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  expiresAt: optional(nullable(date())),
  itemId: pipe(string(), minLength(1, "itemId is required")),
  itemType: DriveItemTypeSchema,
  maxViews: optional(nullable(number())),
  password: optional(nullable(string())),
  permission: DrivePublicLinkPermissionSchema,
});

export type CreatePublicLinkInput = InferOutput<typeof CreatePublicLinkSchema>;

export const UpdatePublicLinkSchema = object({
  expiresAt: optional(nullable(date())),
  isActive: optional(boolean()),
  maxViews: optional(nullable(number())),
  password: optional(nullable(string())),
  permission: optional(DrivePublicLinkPermissionSchema),
});

export type UpdatePublicLinkInput = InferOutput<typeof UpdatePublicLinkSchema>;

export const ResolvePublicLinkSchema = object({
  password: optional(string()),
  token: pipe(string(), minLength(1, "Token is required")),
});

export type ResolvePublicLinkInput = InferOutput<
  typeof ResolvePublicLinkSchema
>;
