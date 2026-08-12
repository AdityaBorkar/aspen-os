import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { address, bankAccount, branch, connectionContact } from "../db-schemas";
import type { BranchTreeNode } from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const MAX_HIERARCHY_DEPTH = 5;

export function generateSlug(name: string): string {
  const SLUG_MAX_LENGTH = 63;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.slice(0, SLUG_MAX_LENGTH);
}

export async function unsetPrimaryAddress(db: DrizzleDB): Promise<void> {
  await db
    .update(address)
    .set({ isPrimary: false })
    .where(eq(address.isPrimary, true));
}

export async function unsetPrimaryBankAccount(db: DrizzleDB): Promise<void> {
  await db
    .update(bankAccount)
    .set({ isPrimary: false })
    .where(eq(bankAccount.isPrimary, true));
}

export async function ensureCodeUnique(
  db: DrizzleDB,
  code: string,
  excludeId?: string,
): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions = [eq(branch.code, upperCode)];
  if (excludeId) {
    conditions.push(sql`${branch.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Branch code "${upperCode}" already exists.`);
  }
}

export async function ensureNoHeadquartersExists(
  db: DrizzleDB,
  excludeId?: string,
): Promise<void> {
  const conditions = [eq(branch.type, "headquarters")];
  if (excludeId) {
    conditions.push(sql`${branch.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(
      "A headquarters branch already exists. Only one headquarters is allowed.",
    );
  }
}

export async function getDepth(
  db: DrizzleDB,
  branchId: string,
): Promise<number> {
  let depth = 0;
  let currentId: string | null = branchId;

  while (currentId !== null) {
    const [row] = await db
      .select({ parentBranch: branch.parentBranch })
      .from(branch)
      .where(eq(branch.id, currentId))
      .limit(1);

    if (!row?.parentBranch) break;
    currentId = row.parentBranch;
    depth++;

    if (depth > MAX_HIERARCHY_DEPTH) {
      throw new Error(
        `Branch hierarchy exceeds maximum depth of ${MAX_HIERARCHY_DEPTH}`,
      );
    }
  }

  return depth;
}

async function wouldCreateCircular(
  db: DrizzleDB,
  branchId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  let depth = 0;

  while (currentId !== null) {
    if (currentId === branchId) return true;
    if (depth >= MAX_HIERARCHY_DEPTH) return true;

    const [row] = await db
      .select({ parentBranch: branch.parentBranch })
      .from(branch)
      .where(eq(branch.id, currentId))
      .limit(1);

    if (!row) break;
    currentId = row.parentBranch;
    depth++;
  }

  return false;
}

export async function validateParentBranch(
  db: DrizzleDB,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId) {
    const circular = await wouldCreateCircular(db, childId, parentId);
    if (circular) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }

  const depth = await getDepth(db, parentId);
  if (depth >= MAX_HIERARCHY_DEPTH - 1) {
    throw new Error(
      `Cannot add a child to this branch. Maximum hierarchy depth of ${MAX_HIERARCHY_DEPTH} levels would be exceeded.`,
    );
  }
}

export async function unsetPrimaryContacts(
  db: DrizzleDB,
  connectionId: string,
): Promise<void> {
  await db
    .update(connectionContact)
    .set({ isPrimary: false })
    .where(
      and(
        eq(connectionContact.connectionId, connectionId),
        eq(connectionContact.isPrimary, true),
      ),
    );
}

export function buildTree(
  branches: { id: string; name: string; parentBranch: string | null }[],
  parentId: string | null,
): BranchTreeNode[] {
  return branches
    .filter((b) => b.parentBranch === parentId)
    .map((b) => ({
      children: buildTree(branches, b.id),
      id: b.id,
      name: b.name,
    }));
}
