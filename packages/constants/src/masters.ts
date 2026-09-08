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

export const MASTER_ENTITY_TYPE = {
  BRANCH: "branch",
  CONNECTION: "connection",
  CONTACT: "contact",
  ENTITY: "entity",
  ORGANIZATION: "organization",
  ORG_BRANCH: "org_branch",
} as const;

export type MasterEntityType = (typeof MASTER_ENTITY_TYPE)[keyof typeof MASTER_ENTITY_TYPE];

export const MASTER_ENTITY_KIND = {
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

export type MasterEntityKind = (typeof MASTER_ENTITY_KIND)[keyof typeof MASTER_ENTITY_KIND];

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
