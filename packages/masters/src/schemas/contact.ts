import { MasterEntityTypeSchema, ContactTypeSchema } from "#/schemas/enums";
import { EmailSchema, IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, maxLength, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateContactSchema = object({
  company: optional(nullable(string())),
  email: optional(nullable(EmailSchema)),
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  isPrimary: optional(boolean(), false),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  phone: optional(nullable(string())),
  title: optional(nullable(pipe(string(), maxLength(255, "Must be at most 255 characters")))),
  type: ContactTypeSchema,
});

export type CreateContactInput = InferOutput<typeof CreateContactSchema>;

export const UpdateContactSchema = object({
  company: optional(nullable(string())),
  email: optional(nullable(EmailSchema)),
  isPrimary: optional(boolean()),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  phone: optional(nullable(string())),
  title: optional(nullable(string())),
  type: optional(ContactTypeSchema),
});

export type UpdateContactInput = InferOutput<typeof UpdateContactSchema>;

export const ContactFiltersSchema = object({
  isPrimary: optional(boolean()),
  search: optional(string()),
  type: optional(ContactTypeSchema),
});

export type ContactFilters = InferOutput<typeof ContactFiltersSchema>;

export const ListContactsSchema = object({
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  filters: optional(ContactFiltersSchema),
});

export type ListContactsInput = InferOutput<typeof ListContactsSchema>;

export const ContactIdSchema = pipe(string(), minLength(1, "Contact id is required"));
