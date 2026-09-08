import { MasterEntityTypeSchema, ContactTypeSchema } from "#/schemas/enums";
import { EmailSchema, IdSchema, MetadataSchema, NameSchema } from "#/schemas/utils";

import {
  boolean,
  check,
  maxLength,
  nullable,
  object,
  optional,
  pipe,
  string,
  transform,
  union,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateContactSchema = pipe(
  object({
    company: optional(nullable(string())),
    createdBy: optional(IdSchema),
    email: optional(nullable(EmailSchema)),
    entityId: optional(IdSchema),
    entityType: optional(MasterEntityTypeSchema),
    firstName: optional(NameSchema),
    lastName: optional(NameSchema),
    linkedUserId: optional(nullable(IdSchema)),
    metadata: optional(nullable(MetadataSchema)),
    name: optional(NameSchema),
    phone: optional(nullable(string())),
    title: optional(nullable(pipe(string(), maxLength(255, "Must be at most 255 characters")))),
    type: optional(ContactTypeSchema, "other"),
  }),
  check(
    (value) =>
      value.name !== undefined || (value.firstName !== undefined && value.lastName !== undefined),
    "Either name or both firstName and lastName are required",
  ),
);

export type CreateContactInput = InferOutput<typeof CreateContactSchema>;

export const UpdateContactSchema = object({
  company: optional(nullable(string())),
  email: optional(nullable(EmailSchema)),
  firstName: optional(nullable(NameSchema)),
  lastName: optional(nullable(NameSchema)),
  linkedUserId: optional(nullable(IdSchema)),
  metadata: optional(nullable(MetadataSchema)),
  name: optional(NameSchema),
  phone: optional(nullable(string())),
  title: optional(nullable(string())),
  type: optional(ContactTypeSchema),
});

export type UpdateContactInput = InferOutput<typeof UpdateContactSchema>;

export const RemoveContactSchema = object({
  reason: pipe(
    string(),
    check((value) => value.length > 0, "Deletion reason is required"),
  ),
});

export type RemoveContactInput = InferOutput<typeof RemoveContactSchema>;

export const ContactFiltersSchema = object({
  isRemoved: optional(
    union([
      boolean(),
      pipe(
        string(),
        transform((value) => value.toLowerCase() === "true"),
      ),
    ]),
  ),
  search: optional(string()),
  type: optional(ContactTypeSchema),
});

export type ContactFilters = InferOutput<typeof ContactFiltersSchema>;

export const ListContactsSchema = object({
  entityId: optional(IdSchema),
  entityType: optional(MasterEntityTypeSchema),
  filters: optional(ContactFiltersSchema),
});

export type ListContactsInput = InferOutput<typeof ListContactsSchema>;
