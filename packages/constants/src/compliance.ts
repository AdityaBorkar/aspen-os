export const COMPLIANCE_CATEGORY = {
  AUDIT: "audit",
  CERTIFICATE: "certificate",
  DATA_PRIVACY: "data_privacy",
  ENVIRONMENTAL: "environmental",
  FINANCIAL: "financial",
  HR: "hr",
  INSURANCE: "insurance",
  LEGAL: "legal",
  LICENSE: "license",
  OTHER: "other",
  PERMIT: "permit",
  PROPERTY: "property",
  REGULATORY: "regulatory",
  SAFETY: "safety",
  TAX: "tax",
  VEHICLE: "vehicle",
} as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORY)[keyof typeof COMPLIANCE_CATEGORY];

export const RENEWAL_FREQUENCY = {
  ANNUAL: "annual",
  BIENNIAL: "biennial",
  MONTHLY: "monthly",
  ONE_TIME: "one_time",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  TRIENNIAL: "triennial",
} as const;

export type RenewalFrequency = (typeof RENEWAL_FREQUENCY)[keyof typeof RENEWAL_FREQUENCY];
