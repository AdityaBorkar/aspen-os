import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, string } from "valibot";

import { dmsFileVersion } from "../db-schemas";
import { remove as removeStorage } from "../services/item-storage-bridge";

type DB = NodePgDatabase<Record<string, never>>;

export const FileIdSchema = string();
export const WithFileIdSchema = object({ id: FileIdSchema });
export const WithIdSchema = object({ id: string() });

export async function pruneOldVersions(db: DB, fileId: string, maxVersions: number): Promise<void> {
  const versions = await db
    .select({
      id: dmsFileVersion.id,
      storageKey: dmsFileVersion.storageKey,
      version: dmsFileVersion.version,
    })
    .from(dmsFileVersion)
    .where(eq(dmsFileVersion.fileId, fileId))
    .orderBy(desc(dmsFileVersion.version));

  if (versions.length <= maxVersions) {
    return;
  }

  const toPrune = versions.slice(maxVersions);

  await Promise.all(
    toPrune.map(async (version) => {
      await removeStorage({ key: version.storageKey });
      await db.delete(dmsFileVersion).where(eq(dmsFileVersion.id, version.id));
    }),
  );
}
