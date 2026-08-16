export const ORGANIZATION_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  SUSPENDED: "suspended",
} as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];

export const BRANCH_TYPE = {
  FACTORY: "factory",
  HEADQUARTERS: "headquarters",
  OFFICE: "office",
  OTHER: "other",
  REMOTE: "remote",
  STORE: "store",
  WAREHOUSE: "warehouse",
} as const;

export type BranchType = (typeof BRANCH_TYPE)[keyof typeof BRANCH_TYPE];

export const CONTACT_TYPE = {
  BANK: "bank",
  CLIENT: "client",
  INSURER: "insurer",
  INVESTOR: "investor",
  OTHER: "other",
  PARENT_COMPANY: "parent_company",
  PARTNER: "partner",
  REGULATOR: "regulator",
  SUBSIDIARY: "subsidiary",
  VENDOR: "vendor",
} as const;

export type ContactType = (typeof CONTACT_TYPE)[keyof typeof CONTACT_TYPE];

export const INTEGRATION_TYPE = {
  API_KEY: "api_key",
  BASIC_AUTH: "basic_auth",
  DATABASE: "database",
  OAUTH2: "oauth2",
  OTHER: "other",
  WEBHOOK: "webhook",
} as const;

export type IntegrationType = (typeof INTEGRATION_TYPE)[keyof typeof INTEGRATION_TYPE];

export const CONNECTION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  INACTIVE: "inactive",
  REVOKED: "revoked",
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

export const NOTE_TYPE = {
  CALL: "call",
  CONTRACT_RENEWAL: "contract_renewal",
  EMAIL: "email",
  GENERAL: "general",
  ISSUE: "issue",
  MEETING: "meeting",
} as const;

export type NoteType = (typeof NOTE_TYPE)[keyof typeof NOTE_TYPE];

export const MASTER_ENTITY_TYPE = {
  BRANCH: "branch",
  CONNECTION: "connection",
  CONTACT: "contact",
  ENTITY: "entity",
  ORGANIZATION: "organization",
} as const;

export type MasterEntityType = (typeof MASTER_ENTITY_TYPE)[keyof typeof MASTER_ENTITY_TYPE];

export const COMPLIANCE_CATEGORY = {
  CERTIFICATE: "certificate",
  ENVIRONMENTAL: "environmental",
  HR: "hr",
  INSURANCE: "insurance",
  LEGAL: "legal",
  LICENSE: "license",
  OTHER: "other",
  PERMIT: "permit",
  REGULATORY: "regulatory",
  SAFETY: "safety",
  TAX: "tax",
} as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORY)[keyof typeof COMPLIANCE_CATEGORY];

export const COMPLIANCE_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  EXPIRED: "expired",
  EXPIRING_SOON: "expiring_soon",
  RENEWAL_IN_PROGRESS: "renewal_in_progress",
} as const;

export type ComplianceStatus = (typeof COMPLIANCE_STATUS)[keyof typeof COMPLIANCE_STATUS];

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

export const ENTITY_TYPE = {
  BANK: "bank",
  CLINIC: "clinic",
  CUSTOMER: "customer",
  GOVERNMENT: "government",
  HOSPITAL: "hospital",
  INSURER: "insurer",
  LABORATORY: "laboratory",
  OTHER: "other",
  PARTNER: "partner",
  PHARMACY: "pharmacy",
  REGULATOR: "regulator",
  STAFFING_AGENCY: "staffing_agency",
  TRAINING_INSTITUTE: "training_institute",
  VENDOR: "vendor",
} as const;

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

export const ENTITY_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  INACTIVE: "inactive",
} as const;

export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];

export const UOM_CATEGORY = {
  AREA: "area",
  COUNT: "count",
  DATA: "data",
  LENGTH: "length",
  MASS: "mass",
  OTHER: "other",
  TEMPERATURE: "temperature",
  TIME: "time",
  VOLUME: "volume",
} as const;

export type UomCategory = (typeof UOM_CATEGORY)[keyof typeof UOM_CATEGORY];

export const PAYMENT_METHOD_TYPE = {
  BANK_ACCOUNT: "bank_account",
  CARD: "card",
  CHEQUE: "cheque",
  IMPS: "imps",
  UPI: "upi",
} as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPE)[keyof typeof PAYMENT_METHOD_TYPE];

export const PAYMENT_METHOD_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  INACTIVE: "inactive",
} as const;

export type PaymentMethodStatus =
  (typeof PAYMENT_METHOD_STATUS)[keyof typeof PAYMENT_METHOD_STATUS];

export const PAYMENT_METHOD_DIRECTION = {
  BOTH: "both",
  INBOUND: "inbound",
  OUTBOUND: "outbound",
} as const;

export type PaymentMethodDirection =
  (typeof PAYMENT_METHOD_DIRECTION)[keyof typeof PAYMENT_METHOD_DIRECTION];

export const CARD_BRAND = {
  AMEX: "amex",
  MASTERCARD: "mastercard",
  OTHER: "other",
  RUPAY: "rupay",
  VISA: "visa",
} as const;

export type CardBrand = (typeof CARD_BRAND)[keyof typeof CARD_BRAND];

export const COUNTRY_CODES = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export function isValidCountryCode(code: string): code is CountryCode {
  // SAFETY: COUNTRY_CODES is a readonly tuple of the declared country-code literals;
  // Widening to readonly string[] is safe because includes() only reads.
  return (COUNTRY_CODES as readonly string[]).includes(code.toUpperCase());
}
