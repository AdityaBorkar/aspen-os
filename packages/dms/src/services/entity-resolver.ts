import { dmsFile, dmsFolder } from "#/db-schemas";
import { isSharableFile, isSharableFolder } from "#/utils/lifecycle";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ResolvedEntity {
  id: string;
  isAccessible: boolean;
  isSharable: boolean;
  kind: "file" | "folder";
}

type DB = PostgresJsDatabase;

/**
 * Existence guard for sharable entities. Returns null when the row does not
 * exist; callers turn that into a not-found error. FK-or-check enforcement on
 * insert is out of scope — this is an application-level guard only.
 */
export async function resolveEntity(
  db: DB,
  type: "file" | "folder",
  id: string,
): Promise<ResolvedEntity | null> {
  if (type === "file") {
    const [file] = await db
      .select({ id: dmsFile.id, status: dmsFile.status })
      .from(dmsFile)
      .where(eq(dmsFile.id, id))
      .limit(1);
    if (!file) {
      return null;
    }
    const sharable = isSharableFile(file.status);
    return { id: file.id, isAccessible: sharable, isSharable: sharable, kind: "file" };
  }

  const [folder] = await db
    .select({ id: dmsFolder.id, isTrashed: dmsFolder.is_trashed })
    .from(dmsFolder)
    .where(eq(dmsFolder.id, id))
    .limit(1);
  if (!folder) {
    return null;
  }
  const sharable = isSharableFolder(folder.isTrashed);
  return { id: folder.id, isAccessible: sharable, isSharable: sharable, kind: "folder" };
}
