import { enum as enum_ } from "valibot";

export const OrganizationStatusSchema = enum_({
  active: "active",
  archived: "archived",
  suspended: "suspended",
});

export const BranchTypeSchema = enum_({
  factory: "factory",
  headquarters: "headquarters",
  office: "office",
  other: "other",
  remote: "remote",
  store: "store",
  warehouse: "warehouse",
});
