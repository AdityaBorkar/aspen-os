import {
  array,
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

import {
  ConnectionNoteTypeSchema,
  ConnectionStatusSchema,
  ConnectionTypeSchema,
} from "./enums";

export const CreateConnectionSchema = object({
  address: optional(nullable(string())),
  annualRevenue: optional(nullable(number())),
  contactEmail: optional(nullable(string())),
  contactPerson: optional(nullable(string())),
  contactPhone: optional(nullable(string())),
  contractValue: optional(nullable(number())),
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  industry: optional(nullable(string())),
  logo: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: pipe(string(), minLength(1, "Connection name is required")),
  notes: optional(nullable(string())),
  relationshipEndDate: optional(date()),
  relationshipStartDate: optional(date()),
  tags: optional(array(string())),
  taxId: optional(nullable(string())),
  type: ConnectionTypeSchema,
  website: optional(nullable(string())),
});

export type CreateConnectionInput = InferOutput<typeof CreateConnectionSchema>;

export const UpdateConnectionSchema = object({
  address: optional(nullable(string())),
  annualRevenue: optional(nullable(number())),
  contactEmail: optional(nullable(string())),
  contactPerson: optional(nullable(string())),
  contactPhone: optional(nullable(string())),
  contractValue: optional(nullable(number())),
  industry: optional(nullable(string())),
  logo: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: optional(string()),
  notes: optional(nullable(string())),
  relationshipEndDate: optional(date()),
  relationshipStartDate: optional(date()),
  tags: optional(array(string())),
  taxId: optional(nullable(string())),
  type: optional(ConnectionTypeSchema),
  website: optional(nullable(string())),
});

export type UpdateConnectionInput = InferOutput<typeof UpdateConnectionSchema>;

export const ConnectionFiltersSchema = object({
  search: optional(string()),
  status: optional(ConnectionStatusSchema),
  tags: optional(array(string())),
  type: optional(ConnectionTypeSchema),
});

export type ConnectionFilters = InferOutput<typeof ConnectionFiltersSchema>;

export const CreateConnectionContactSchema = object({
  connectionId: pipe(string(), minLength(1, "connectionId is required")),
  email: optional(nullable(string())),
  isPrimary: optional(boolean()),
  name: pipe(string(), minLength(1, "Contact name is required")),
  notes: optional(nullable(string())),
  phone: optional(nullable(string())),
  title: optional(nullable(string())),
});

export type CreateConnectionContactInput = InferOutput<
  typeof CreateConnectionContactSchema
>;

export const UpdateConnectionContactSchema = object({
  email: optional(nullable(string())),
  isPrimary: optional(boolean()),
  name: optional(string()),
  notes: optional(nullable(string())),
  phone: optional(nullable(string())),
  title: optional(nullable(string())),
});

export type UpdateConnectionContactInput = InferOutput<
  typeof UpdateConnectionContactSchema
>;

export const CreateConnectionNoteSchema = object({
  connectionId: pipe(string(), minLength(1, "connectionId is required")),
  content: pipe(string(), minLength(1, "Content is required")),
  type: ConnectionNoteTypeSchema,
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateConnectionNoteInput = InferOutput<
  typeof CreateConnectionNoteSchema
>;
