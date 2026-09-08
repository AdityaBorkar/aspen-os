import { dmsEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsAccessLog = pgTable(
  "dms_access_log",
  {
    accessed_by: text(),
    action: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entity_id: text().notNull(),
    entity_type: dmsEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    ip: text(),
    public_link_id: text(),
    user_agent: text(),
  },
  (table) => [
    index("idx_dms_access_log_entity").on(table.entity_id, table.entity_type),
    index("idx_dms_access_log_public_link").on(table.public_link_id),
    index("idx_dms_access_log_created").on(table.created_at),
  ],
);

export type DmsAccessLog = typeof dmsAccessLog.$inferSelect;
export type NewDmsAccessLog = typeof dmsAccessLog.$inferInsert;
