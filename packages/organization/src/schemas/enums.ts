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

export const ConnectionTypeSchema = enum_({
  bank: "bank",
  client: "client",
  insurer: "insurer",
  investor: "investor",
  other: "other",
  parent_company: "parent_company",
  partner: "partner",
  regulator: "regulator",
  subsidiary: "subsidiary",
  vendor: "vendor",
});

export const ConnectionStatusSchema = enum_({
  active: "active",
  former: "former",
  inactive: "inactive",
  prospect: "prospect",
});

export const ConnectionNoteTypeSchema = enum_({
  call: "call",
  contract_renewal: "contract_renewal",
  email: "email",
  general: "general",
  issue: "issue",
  meeting: "meeting",
});
