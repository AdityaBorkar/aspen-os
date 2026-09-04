import { department } from "#/db-schemas";
import type { Db } from "#/workflows/db";

import { and, eq, sql } from "drizzle-orm";

export async function ensureDepartmentCodeUnique(
  db: Db,
  code: string,
  excludeId?: string,
): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions = [eq(department.code, upperCode)];
  if (excludeId) {
    conditions.push(sql`${department.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: department.id })
    .from(department)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Department code "${upperCode}" already exists.`);
  }
}

export async function wouldCreateCircular(
  db: Db,
  deptId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  let depth = 0;
  const maxDepth = 10;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (currentId === deptId) {
      return true;
    }
    if (depth >= maxDepth) {
      return true;
    }

    const [parent] = await db
      .select({ parentDepartment: department.parentDepartment })
      .from(department)
      .where(eq(department.id, currentId))
      .limit(1);

    if (!parent) {
      break;
    }
    currentId = parent.parentDepartment;
    depth++;
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function validateParentDepartment(
  db: Db,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId) {
    const wouldCycle = await wouldCreateCircular(db, childId, parentId);
    if (wouldCycle) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }
}
