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

export const ComplianceCategorySchema = enum_({
  certificate: "certificate",
  environmental: "environmental",
  hr: "hr",
  insurance: "insurance",
  legal: "legal",
  license: "license",
  other: "other",
  permit: "permit",
  regulatory: "regulatory",
  safety: "safety",
  tax: "tax",
});

export const ComplianceStatusSchema = enum_({
  active: "active",
  archived: "archived",
  expired: "expired",
  expiring_soon: "expiring_soon",
  renewal_in_progress: "renewal_in_progress",
});

export const RenewalFrequencySchema = enum_({
  annual: "annual",
  biennial: "biennial",
  monthly: "monthly",
  one_time: "one_time",
  quarterly: "quarterly",
  semi_annual: "semi_annual",
  triennial: "triennial",
});
