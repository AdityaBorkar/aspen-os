import { accountingPaymentTermTemplate } from "#/db-schemas/tax";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase;

export interface DeriveDueDateInput {
  db: Db;
  dueDate?: string | null;
  paymentTermsTemplateId?: string | null;
  postingDate: string;
}

function addDays(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const iso = date.toISOString();
  return iso.split("T")[0] ?? base;
}

export async function deriveDueDate(input: DeriveDueDateInput): Promise<string | null> {
  const { db, dueDate, paymentTermsTemplateId, postingDate } = input;
  if (dueDate) {
    return dueDate;
  }
  if (!paymentTermsTemplateId) {
    return null;
  }
  const [template] = await db
    .select()
    .from(accountingPaymentTermTemplate)
    .where(eq(accountingPaymentTermTemplate.id, paymentTermsTemplateId))
    .limit(1);
  if (!template) {
    return null;
  }
  const schedule = template.schedule ?? [];
  if (schedule.length === 0) {
    return null;
  }
  let maxDays = 0;
  for (const line of schedule) {
    if (line.daysAfter > maxDays) {
      maxDays = line.daysAfter;
    }
  }
  return addDays(postingDate, maxDays);
}
