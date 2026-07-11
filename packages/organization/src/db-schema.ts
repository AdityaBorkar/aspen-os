import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  "active",
  "suspended",
  "archived",
]);

export const branchTypeEnum = pgEnum("branch_type", [
  "headquarters",
  "office",
  "warehouse",
  "store",
  "factory",
  "remote",
  "other",
]);

export const connectionTypeEnum = pgEnum("connection_type", [
  "client",
  "vendor",
  "partner",
  "subsidiary",
  "parent_company",
  "investor",
  "regulator",
  "insurer",
  "bank",
  "other",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "inactive",
  "prospect",
  "former",
]);

export const connectionNoteTypeEnum = pgEnum("connection_note_type", [
  "general",
  "call",
  "email",
  "meeting",
  "contract_renewal",
  "issue",
]);

export const address = pgTable(
  "address",
  {
    city: text("city"),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isPrimary: boolean("is_primary").notNull().default(false),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    metadata: jsonb("metadata"),
    postalCode: text("postal_code"),
    state: text("state"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_address_country").on(table.country),
    index("idx_address_is_primary").on(table.isPrimary),
  ],
);

export const bankAccount = pgTable(
  "bank_account",
  {
    accountHolderName: text("account_holder_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountType: text("account_type"),
    bankName: text("bank_name").notNull(),
    branchName: text("branch_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currency: text("currency").notNull().default("USD"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
    metadata: jsonb("metadata"),
    routingNumber: text("routing_number"),
    swiftCode: text("swift_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bank_account_is_active").on(table.isActive),
    index("idx_bank_account_is_primary").on(table.isPrimary),
  ],
);

export const organization = pgTable(
  "organization",
  {
    accentColor: text("accent_color").notNull().default("#3B82F6"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email"),
    foundedDate: date("founded_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    industry: text("industry"),
    locale: text("locale").notNull().default("en-US"),
    logo: text("logo"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    phone: text("phone"),
    registrationNumber: text("registration_number"),
    slug: text("slug").notNull().unique(),
    status: organizationStatusEnum("status").notNull().default("active"),
    taxId: text("tax_id"),
    timezone: text("timezone").notNull().default("UTC"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    website: text("website"),
  },
  (table) => [index("idx_organization_slug").on(table.slug)],
);

export const branch = pgTable(
  "branch",
  {
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    capacity: integer("capacity"),
    city: text("city").notNull(),
    closedDate: date("closed_date"),
    code: text("code").notNull().unique(),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    manager: text("manager"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    notes: text("notes"),
    openedDate: date("opened_date"),
    parentBranch: text("parent_branch"),
    phone: text("phone"),
    postalCode: text("postal_code"),
    state: text("state"),
    timezone: text("timezone"),
    type: branchTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_branch_type").on(table.type),
    index("idx_branch_is_active").on(table.isActive),
    index("idx_branch_country").on(table.country),
    index("idx_branch_parent").on(table.parentBranch),
  ],
);

export const connection = pgTable(
  "connection",
  {
    address: text("address"),
    annualRevenue: numeric("annual_revenue"),
    contactEmail: text("contact_email"),
    contactPerson: text("contact_person"),
    contactPhone: text("contact_phone"),
    contractValue: numeric("contract_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    industry: text("industry"),
    logo: text("logo"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    notes: text("notes"),
    relationshipEndDate: date("relationship_end_date"),
    relationshipStartDate: date("relationship_start_date"),
    status: connectionStatusEnum("status").notNull().default("active"),
    tags: text("tags").array().default([]),
    taxId: text("tax_id"),
    type: connectionTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    website: text("website"),
  },
  (table) => [
    index("idx_connection_type").on(table.type),
    index("idx_connection_status").on(table.status),
  ],
);

export const connectionContact = pgTable(
  "connection_contact",
  {
    connectionId: text("connection_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isPrimary: boolean("is_primary").notNull().default(false),
    name: text("name").notNull(),
    notes: text("notes"),
    phone: text("phone"),
    title: text("title"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_connection_contact_connection").on(table.connectionId),
  ],
);

export const connectionNote = pgTable(
  "connection_note",
  {
    connectionId: text("connection_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    type: connectionNoteTypeEnum("type").notNull().default("general"),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_connection_note_connection").on(table.connectionId),
    index("idx_connection_note_type").on(table.type),
  ],
);
