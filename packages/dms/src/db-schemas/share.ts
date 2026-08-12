import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { GRANTEE_TYPE, SHARE_PERMISSION } from "../utils/constants";

export const dmsGranteeTypeEnum = pgEnum("dms_grantee_type", [
  GRANTEE_TYPE.CONTACT,
  GRANTEE_TYPE.USER,
]);

export const dmsSharePermissionEnum = pgEnum("dms_share_permission", [
  SHARE_PERMISSION.VIEWER,
  SHARE_PERMISSION.EDITOR,
]);

export const dmsShare = pgTable(
  "dms_share",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    documentId: text("document_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    granteeId: text("grantee_id").notNull(),
    granteeType: dmsGranteeTypeEnum("grantee_type").notNull(),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    permission: dmsSharePermissionEnum("permission")
      .notNull()
      .default("viewer"),
    sharedBy: text("shared_by").notNull(),
    shareToken: text("share_token"),
  },
  (table) => [
    index("idx_dms_share_document").on(table.documentId),
    index("idx_dms_share_grantee").on(table.granteeId),
    uniqueIndex("idx_dms_share_doc_grantee").on(
      table.documentId,
      table.granteeType,
      table.granteeId,
    ),
  ],
);

export type DmsShare = typeof dmsShare.$inferSelect;
export type NewDmsShare = typeof dmsShare.$inferInsert;
