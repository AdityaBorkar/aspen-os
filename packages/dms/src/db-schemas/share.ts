import { dmsEntityTypeEnum, dmsGranteeTypeEnum, dmsSharePermissionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dmsShare = pgTable(
  "dms_share",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entity_id: text().notNull(),
    entity_type: dmsEntityTypeEnum().notNull(),
    expires_at: timestamp({ withTimezone: true }),
    grantee_id: text().notNull(),
    grantee_type: dmsGranteeTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    message: text(),
    permission: dmsSharePermissionEnum().notNull().default("viewer"),
    share_token: text(),
    shared_by: text().notNull(),
  },
  (table) => [
    index("idx_dms_share_entity").on(table.entity_id, table.entity_type),
    index("idx_dms_share_grantee").on(table.grantee_id, table.grantee_type),
    uniqueIndex("idx_dms_share_entity_grantee").on(
      table.entity_type,
      table.entity_id,
      table.grantee_type,
      table.grantee_id,
    ),
  ],
);

export type DmsShare = typeof dmsShare.$inferSelect;
export type NewDmsShare = typeof dmsShare.$inferInsert;
