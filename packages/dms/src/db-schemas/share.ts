import { dmsEntityTypeEnum, dmsGranteeTypeEnum, dmsSharePermissionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dmsShare = pgTable(
  "dms_share",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: dmsEntityTypeEnum("entity_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    granteeId: text("grantee_id").notNull(),
    granteeType: dmsGranteeTypeEnum("grantee_type").notNull(),
    id: uuidv7("id").primaryKey(),
    message: text("message"),
    permission: dmsSharePermissionEnum("permission").notNull().default("viewer"),
    shareToken: text("share_token"),
    sharedBy: text("shared_by").notNull(),
  },
  (table) => [
    index("idx_dms_share_entity").on(table.entityId, table.entityType),
    index("idx_dms_share_grantee").on(table.granteeId, table.granteeType),
    uniqueIndex("idx_dms_share_entity_grantee").on(
      table.entityType,
      table.entityId,
      table.granteeType,
      table.granteeId,
    ),
  ],
);

export type DmsShare = typeof dmsShare.$inferSelect;
export type NewDmsShare = typeof dmsShare.$inferInsert;
