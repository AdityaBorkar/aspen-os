import { dmsFile } from "#/db-schemas";
import type { DmsFile } from "#/types";

import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function patchFileMetadata(
  db: PostgresJsDatabase,
  file: DmsFile,
  mutate: (metadata: Record<string, JsonValue>) => Record<string, JsonValue>,
): Promise<DmsFile> {
  const metadata = mutate({ ...file.metadata });

  const [updated] = await db
    .update(dmsFile)
    .set({ metadata, updatedAt: new Date() })
    .where(eq(dmsFile.id, file.id))
    .returning();

  if (!updated) {
    throw new Error(`File "${file.id}" not found.`);
  }
  return updated;
}
