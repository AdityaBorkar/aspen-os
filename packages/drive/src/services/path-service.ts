import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { driveFile, driveFolder } from "../db-schema";
import type { BreadcrumbItem, PathResolution } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export class PathService {
  constructor(
    private db: DB,
    private readonly maxNestingDepth: number = 20,
  ) {}

  get maxDepth(): number {
    return this.maxNestingDepth;
  }

  async computeFolderPath(
    name: string,
    parentId: string | null,
  ): Promise<string> {
    if (!parentId) return `/${name}`;
    const parentPath = await this.getFolderPath(parentId);
    return `${parentPath}/${name}`;
  }

  async computeFilePath(
    name: string,
    folderId: string | null,
  ): Promise<string> {
    if (!folderId) return `/${name}`;
    const folderPath = await this.getFolderPath(folderId);
    return `${folderPath}/${name}`;
  }

  async resolvePath(path: string): Promise<PathResolution | null> {
    const normalized = this.normalizePath(path);

    const [folder] = await this.db
      .select({
        id: driveFolder.id,
        name: driveFolder.name,
        path: driveFolder.path,
      })
      .from(driveFolder)
      .where(eq(driveFolder.path, normalized))
      .limit(1);

    if (folder) {
      return { ...folder, type: "folder" as const };
    }

    const [file] = await this.db
      .select({
        id: driveFile.id,
        name: driveFile.name,
        path: driveFile.path,
      })
      .from(driveFile)
      .where(eq(driveFile.path, normalized))
      .limit(1);

    if (file) {
      return { ...file, type: "file" as const };
    }

    return null;
  }

  async getBreadcrumbs(folderId: string): Promise<BreadcrumbItem[]> {
    const [folder] = await this.db
      .select({
        id: driveFolder.id,
        name: driveFolder.name,
        parentId: driveFolder.parentId,
        path: driveFolder.path,
      })
      .from(driveFolder)
      .where(eq(driveFolder.id, folderId))
      .limit(1);

    if (!folder) {
      throw new Error(`Folder "${folderId}" not found.`);
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { id: folder.id, name: folder.name, path: folder.path },
    ];

    let currentParentId = folder.parentId;
    while (currentParentId) {
      const [parent] = await this.db
        .select({
          id: driveFolder.id,
          name: driveFolder.name,
          parentId: driveFolder.parentId,
          path: driveFolder.path,
        })
        .from(driveFolder)
        .where(eq(driveFolder.id, currentParentId))
        .limit(1);

      if (!parent) break;
      breadcrumbs.unshift({
        id: parent.id,
        name: parent.name,
        path: parent.path,
      });
      currentParentId = parent.parentId;
    }

    return breadcrumbs;
  }

  async cascadePaths(oldPath: string, newPath: string, tx?: DB): Promise<void> {
    const db = tx ?? this.db;
    const prefix = `${oldPath}/%`;

    const descendantFolders = await db
      .select({ id: driveFolder.id, path: driveFolder.path })
      .from(driveFolder)
      .where(sql`${driveFolder.path} like ${prefix}`);

    for (const f of descendantFolders) {
      const updatedPath = newPath + f.path.slice(oldPath.length);
      await db
        .update(driveFolder)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(driveFolder.id, f.id));
    }

    const descendantFiles = await db
      .select({ id: driveFile.id, path: driveFile.path })
      .from(driveFile)
      .where(sql`${driveFile.path} like ${prefix}`);

    for (const file of descendantFiles) {
      const updatedPath = newPath + file.path.slice(oldPath.length);
      await db
        .update(driveFile)
        .set({ path: updatedPath, updatedAt: new Date() })
        .where(eq(driveFile.id, file.id));
    }
  }

  async wouldCreateCycle(
    folderId: string,
    newParentId: string | null,
  ): Promise<boolean> {
    if (!newParentId) return false;
    if (folderId === newParentId) return true;

    let currentId: string | null = newParentId;
    let depth = 0;

    while (currentId !== null) {
      if (currentId === folderId) return true;
      if (depth >= this.maxDepth) return true;

      const [parent] = await this.db
        .select({ parentId: driveFolder.parentId })
        .from(driveFolder)
        .where(eq(driveFolder.id, currentId))
        .limit(1);

      if (!parent) break;
      currentId = parent.parentId;
      depth++;
    }

    return false;
  }

  async getDepth(folderId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = folderId;

    while (currentId !== null) {
      const [parent] = await this.db
        .select({ parentId: driveFolder.parentId })
        .from(driveFolder)
        .where(eq(driveFolder.id, currentId))
        .limit(1);

      if (!parent?.parentId) break;
      currentId = parent.parentId;
      depth++;

      if (depth > this.maxDepth) {
        throw new Error(
          `Folder hierarchy exceeds maximum depth of ${this.maxDepth}`,
        );
      }
    }

    return depth;
  }

  async getSubtreeMaxDepth(folderPath: string): Promise<number> {
    const prefix = `${folderPath}/%`;
    const descendants = await this.db
      .select({ path: driveFolder.path })
      .from(driveFolder)
      .where(sql`${driveFolder.path} like ${prefix}`);

    const baseDepth = folderPath.split("/").length - 1;
    let maxDepth = 0;

    for (const d of descendants) {
      const depth = d.path.split("/").length - 1 - baseDepth;
      if (depth > maxDepth) maxDepth = depth;
    }

    return maxDepth;
  }

  async checkNameUniqueness(
    name: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const basePath = parentId ? await this.getFolderPath(parentId) : "";
    const newPath = `${basePath}/${name}`;
    const lowerPath = newPath.toLowerCase();

    const folderConditions = [
      sql`lower(${driveFolder.path}) = ${lowerPath}`,
      eq(driveFolder.isTrashed, false),
    ];
    if (excludeId) {
      folderConditions.push(sql`${driveFolder.id} != ${excludeId}`);
    }

    const [existingFolder] = await this.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(and(...folderConditions))
      .limit(1);

    if (existingFolder) {
      throw new Error(
        `An item named "${name}" already exists in this location.`,
      );
    }

    const fileConditions = [
      sql`lower(${driveFile.path}) = ${lowerPath}`,
      eq(driveFile.isTrashed, false),
    ];

    const [existingFile] = await this.db
      .select({ id: driveFile.id })
      .from(driveFile)
      .where(and(...fileConditions))
      .limit(1);

    if (existingFile) {
      throw new Error(
        `An item named "${name}" already exists in this location.`,
      );
    }
  }

  async getFolderPath(folderId: string): Promise<string> {
    const [folder] = await this.db
      .select({ path: driveFolder.path })
      .from(driveFolder)
      .where(eq(driveFolder.id, folderId))
      .limit(1);

    if (!folder) {
      throw new Error(`Folder "${folderId}" not found.`);
    }

    return folder.path;
  }

  async getFilePath(fileId: string): Promise<string> {
    const [file] = await this.db
      .select({ path: driveFile.path })
      .from(driveFile)
      .where(eq(driveFile.id, fileId))
      .limit(1);

    if (!file) {
      throw new Error(`File "${fileId}" not found.`);
    }

    return file.path;
  }

  private normalizePath(path: string): string {
    if (!path.startsWith("/")) return `/${path}`;
    return path;
  }
}
