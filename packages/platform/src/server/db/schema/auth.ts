import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  ban_expires: timestamp(),
  ban_reason: text(),
  banned: boolean().default(false),
  created_at: timestamp().defaultNow().notNull(),
  display_username: text(),
  email: text().notNull().unique(),
  email_verified: boolean().default(false).notNull(),
  id: text().primaryKey(),
  image: text(),
  name: text().notNull(),
  phone_number: text().unique(),
  phone_number_verified: boolean(),
  role: text(),
  two_factor_enabled: boolean().default(false),
  updated_at: timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text().unique(),
});

export const session = pgTable(
  "session",
  {
    active_organization_id: text(),
    created_at: timestamp().defaultNow().notNull(),
    expires_at: timestamp().notNull(),
    id: text().primaryKey(),
    impersonated_by: text(),
    ip_address: text(),
    token: text().notNull().unique(),
    updated_at: timestamp()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    user_agent: text(),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.user_id)],
);

export const account = pgTable(
  "account",
  {
    access_token: text(),
    access_token_expires_at: timestamp(),
    account_id: text().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    id: text().primaryKey(),
    id_token: text(),
    password: text(),
    provider_id: text().notNull(),
    refresh_token: text(),
    refresh_token_expires_at: timestamp(),
    scope: text(),
    updated_at: timestamp()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_userId_idx").on(table.user_id)],
);

export const verification = pgTable(
  "verification",
  {
    created_at: timestamp().defaultNow().notNull(),
    expires_at: timestamp().notNull(),
    id: text().primaryKey(),
    identifier: text().notNull(),
    updated_at: timestamp()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    value: text().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable("organization", {
  created_at: timestamp().notNull(),
  id: text().primaryKey(),
  logo: text(),
  metadata: text(),
  name: text().notNull(),
  slug: text().notNull().unique(),
});

export const member = pgTable(
  "member",
  {
    created_at: timestamp().notNull(),
    id: text().primaryKey(),
    organization_id: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text().default("member").notNull(),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organization_id),
    index("member_userId_idx").on(table.user_id),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    created_at: timestamp().defaultNow().notNull(),
    email: text().notNull(),
    expires_at: timestamp().notNull(),
    id: text().primaryKey(),
    inviter_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organization_id: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text(),
    status: text().default("pending").notNull(),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organization_id),
    index("invitation_email_idx").on(table.email),
  ],
);

export const apikey = pgTable(
  "apikey",
  {
    config_id: text().default("default").notNull(),
    created_at: timestamp().notNull(),
    enabled: boolean().default(true),
    expires_at: timestamp(),
    id: text().primaryKey(),
    key: text().notNull(),
    last_refill_at: timestamp(),
    last_request: timestamp(),
    metadata: text(),
    name: text(),
    permissions: text(),
    prefix: text(),
    rate_limit_enabled: boolean().default(true),
    rate_limit_max: integer().default(10),
    rate_limit_time_window: integer().default(86_400_000),
    reference_id: text().notNull(),
    refill_amount: integer(),
    refill_interval: integer(),
    remaining: integer(),
    request_count: integer().default(0),
    start: text(),
    updated_at: timestamp().notNull(),
  },
  (table) => [
    index("apikey_configId_idx").on(table.config_id),
    index("apikey_referenceId_idx").on(table.reference_id),
    index("apikey_key_idx").on(table.key),
  ],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    backup_codes: text().notNull(),
    failed_verification_count: integer().default(0),
    id: text().primaryKey(),
    locked_until: timestamp(),
    secret: text().notNull(),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
  },
  (table) => [
    index("twoFactor_secret_idx").on(table.secret),
    index("twoFactor_userId_idx").on(table.user_id),
  ],
);

export const passkey = pgTable(
  "passkey",
  {
    aaguid: text(),
    backed_up: boolean().notNull(),
    counter: integer().notNull(),
    created_at: timestamp(),
    credential_id: text().notNull(),
    device_type: text().notNull(),
    id: text().primaryKey(),
    name: text(),
    public_key: text().notNull(),
    transports: text(),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("passkey_userId_idx").on(table.user_id),
    index("passkey_credentialID_idx").on(table.credential_id),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  invitations: many(invitation),
  members: many(member),
  passkeys: many(passkey),
  sessions: many(session),
  twoFactors: many(twoFactor),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.user_id],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.user_id],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  invitations: many(invitation),
  members: many(member),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organization_id],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.user_id],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organization_id],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviter_id],
    references: [user.id],
  }),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.user_id],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.user_id],
    references: [user.id],
  }),
}));
