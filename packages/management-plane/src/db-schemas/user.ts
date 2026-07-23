import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  createdAt: timestamp("created_at").notNull(),
  email: text("email").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  spId: text("sp_id"),
  updatedAt: timestamp("updated_at").notNull(),
});
