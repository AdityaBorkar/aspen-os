import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const healthcareCounter = pgTable("healthcare_counter", {
  last_no: integer().notNull().default(0),
  series: text().primaryKey(),
});

export type HealthcareCounter = typeof healthcareCounter.$inferSelect;
export type NewHealthcareCounter = typeof healthcareCounter.$inferInsert;
