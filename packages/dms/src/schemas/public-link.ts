import { EntityTypeSchema, PublicLinkPermissionSchema } from "#/schemas/enums";

import {
  boolean,
  date,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreatePublicLinkSchema = object({
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  entityId: pipe(string(), minLength(1, "entityId is required")),
  entityType: EntityTypeSchema,
  expiresAt: optional(nullable(date())),
  maxViews: optional(nullable(number())),
  password: optional(nullable(string())),
  permission: PublicLinkPermissionSchema,
});

export type CreatePublicLinkInput = InferOutput<typeof CreatePublicLinkSchema>;

export const UpdatePublicLinkSchema = object({
  expiresAt: optional(nullable(date())),
  isActive: optional(boolean()),
  maxViews: optional(nullable(number())),
  password: optional(nullable(string())),
  permission: optional(PublicLinkPermissionSchema),
});

export type UpdatePublicLinkInput = InferOutput<typeof UpdatePublicLinkSchema>;

export const ResolvePublicLinkSchema = object({
  password: optional(string()),
  token: pipe(string(), minLength(1, "Token is required")),
});

export type ResolvePublicLinkInput = InferOutput<typeof ResolvePublicLinkSchema>;
