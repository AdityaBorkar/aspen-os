import { EntityStatusSchema, EntityTypeSchema } from "#/schemas/enums";
import { EmailSchema, IdSchema, NameSchema } from "#/schemas/utils";

import { date, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateEntitySchema = object({
  code: optional(nullable(string())),
  email: optional(nullable(EmailSchema)),
  foundedDate: optional(nullable(date())),
  industry: optional(nullable(string())),
  locale: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  organizationId: optional(nullable(IdSchema)),
  phone: optional(nullable(string())),
  registrationNumber: optional(nullable(string())),
  status: optional(EntityStatusSchema, "active"),
  taxId: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: EntityTypeSchema,
  website: optional(nullable(string())),
});

export type CreateEntityInput = InferOutput<typeof CreateEntitySchema>;

export const UpdateEntitySchema = object({
  code: optional(string()),
  email: optional(EmailSchema),
  foundedDate: optional(date()),
  industry: optional(string()),
  locale: optional(string()),
  metadata: optional(object({})),
  name: optional(NameSchema),
  organizationId: optional(IdSchema),
  phone: optional(string()),
  registrationNumber: optional(string()),
  status: optional(EntityStatusSchema),
  taxId: optional(string()),
  timezone: optional(string()),
  type: optional(EntityTypeSchema),
  website: optional(string()),
});

export type UpdateEntityInput = InferOutput<typeof UpdateEntitySchema>;

export const EntityFiltersSchema = object({
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  organizationId: optional(IdSchema),
  search: optional(string()),
  status: optional(EntityStatusSchema),
  type: optional(EntityTypeSchema),
});

export type EntityFilters = InferOutput<typeof EntityFiltersSchema>;

export const ListEntitiesSchema = object({
  filters: optional(EntityFiltersSchema),
});

export type ListEntitiesInput = InferOutput<typeof ListEntitiesSchema>;

export const EntitySetStatusSchema = object({
  id: IdSchema,
  status: EntityStatusSchema,
});

export type EntitySetStatusInput = InferOutput<typeof EntitySetStatusSchema>;
