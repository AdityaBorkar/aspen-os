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

import { BranchTypeSchema } from "./enums";
import { BranchCodeSchema, CountryCodeSchema, NameSchema } from "./utils";

export const CreateBranchSchema = object({
  addressLine1: pipe(string(), minLength(1, "Address is required")),
  addressLine2: optional(nullable(string())),
  capacity: optional(nullable(number())),
  city: pipe(string(), minLength(1, "City is required")),
  closedDate: optional(date()),
  code: BranchCodeSchema,
  country: CountryCodeSchema,
  email: optional(nullable(string())),
  manager: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  notes: optional(nullable(string())),
  openedDate: optional(date()),
  parentBranch: optional(nullable(string())),
  phone: optional(nullable(string())),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: BranchTypeSchema,
});

export type CreateBranchInput = InferOutput<typeof CreateBranchSchema>;

export const UpdateBranchSchema = object({
  addressLine1: optional(string()),
  addressLine2: optional(nullable(string())),
  capacity: optional(nullable(number())),
  city: optional(string()),
  closedDate: optional(date()),
  code: optional(BranchCodeSchema),
  country: optional(CountryCodeSchema),
  email: optional(nullable(string())),
  isActive: optional(boolean()),
  manager: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  notes: optional(nullable(string())),
  openedDate: optional(date()),
  parentBranch: optional(nullable(string())),
  phone: optional(nullable(string())),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
  timezone: optional(nullable(string())),
  type: optional(BranchTypeSchema),
});

export type UpdateBranchInput = InferOutput<typeof UpdateBranchSchema>;

export const BranchFiltersSchema = object({
  country: optional(string()),
  isActive: optional(boolean()),
  parentBranch: optional(string()),
  type: optional(BranchTypeSchema),
});

export type BranchFilters = InferOutput<typeof BranchFiltersSchema>;
