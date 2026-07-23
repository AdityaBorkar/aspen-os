import {
  CONNECTION_NOTE_TYPE,
  CONNECTION_STATUS,
  CONNECTION_TYPE,
} from "@aspen-os/constants";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const connectionTypeEnum = pgEnum("connection_type", [
  CONNECTION_TYPE.BANK,
  CONNECTION_TYPE.CLIENT,
  CONNECTION_TYPE.INSURER,
  CONNECTION_TYPE.INVESTOR,
  CONNECTION_TYPE.OTHER,
  CONNECTION_TYPE.PARENT_COMPANY,
  CONNECTION_TYPE.PARTNER,
  CONNECTION_TYPE.REGULATOR,
  CONNECTION_TYPE.SUBSIDIARY,
  CONNECTION_TYPE.VENDOR,
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  CONNECTION_STATUS.ACTIVE,
  CONNECTION_STATUS.FORMER,
  CONNECTION_STATUS.INACTIVE,
  CONNECTION_STATUS.PROSPECT,
]);

export const connectionNoteTypeEnum = pgEnum("connection_note_type", [
  CONNECTION_NOTE_TYPE.CALL,
  CONNECTION_NOTE_TYPE.CONTRACT_RENEWAL,
  CONNECTION_NOTE_TYPE.EMAIL,
  CONNECTION_NOTE_TYPE.GENERAL,
  CONNECTION_NOTE_TYPE.ISSUE,
  CONNECTION_NOTE_TYPE.MEETING,
]);

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
