import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsView } from "../db-schemas";

export async function unsetDefaultView(db: NodePgDatabase, ownerId: string): Promise<void> {
  await db
    .update(dmsView)
    .set({ isDefault: false })
    .where(and(eq(dmsView.ownerId, ownerId), eq(dmsView.isDefault, true)));
}

export function resolveViewField(field: string): unknown {
  switch (field) {
    case "createdAt":
      return dmsView.createdAt;
    case "name":
      return dmsView.name;
    case "updatedAt":
      return dmsView.updatedAt;
    default:
      return null;
  }
}
