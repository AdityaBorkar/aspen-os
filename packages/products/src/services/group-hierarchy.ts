import { productsItemGroup } from "#/db-schemas";
import type { ProductsItemGroup } from "#/db-schemas/item-group";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

type Db = WorkflowContext["db"];

const MAX_GROUP_DEPTH = 8;

export async function validateParentGroup(
  db: Db,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId !== undefined && parentId === childId) {
    throw new Error("A group cannot be its own parent.");
  }
  const seen = new Set<string>();
  let depth = 0;
  let currentId: string | null = parentId;
  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (seen.has(currentId) || currentId === childId) {
      throw new Error("Setting this parent would create a circular reference.");
    }
    seen.add(currentId);
    // SAFETY: selecting only parent_id keeps the row shape narrow by construction.
    const [row] = (await db
      .select({ parentId: productsItemGroup.parent_id })
      .from(productsItemGroup)
      .where(eq(productsItemGroup.id, currentId))
      .limit(1)) as { parentId: string | null }[];
    if (!row) {
      if (depth === 0) {
        throw new Error(`Parent group with id "${parentId}" not found.`);
      }
      break;
    }
    currentId = row.parentId;
    if (currentId !== null) {
      depth += 1;
    }
  }
  // oxlint-enable eslint/no-await-in-loop
  if (depth + 1 >= MAX_GROUP_DEPTH) {
    throw new Error(`Maximum group depth of ${MAX_GROUP_DEPTH} levels would be exceeded.`);
  }
}

export interface GroupTreeNode {
  children: GroupTreeNode[];
  id: string;
  name: string;
}

export function buildGroupTree(
  groups: { id: string; name: string; parentId: string | null }[],
): GroupTreeNode[] {
  const ids = new Set(groups.map((item) => item.id));
  const childrenByParent = new Map<string | null, typeof groups>();
  for (const item of groups) {
    const key = item.parentId !== null && !ids.has(item.parentId) ? null : item.parentId;
    const group = childrenByParent.get(key) ?? [];
    group.push(item);
    childrenByParent.set(key, group);
  }
  const build = (parentId: string | null): GroupTreeNode[] =>
    (childrenByParent.get(parentId) ?? []).map((item) => ({
      children: build(item.id),
      id: item.id,
      name: item.name,
    }));
  return build(null);
}

export async function collectDescendantGroupIds(db: Db, rootId: string): Promise<string[]> {
  const all = await db
    .select({ id: productsItemGroup.id, parentId: productsItemGroup.parent_id })
    .from(productsItemGroup);
  const childrenByParent = new Map<string | null, string[]>();
  for (const row of all) {
    const list = childrenByParent.get(row.parentId) ?? [];
    list.push(row.id);
    childrenByParent.set(row.parentId, list);
  }
  const result: string[] = [rootId];
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    for (const child of childrenByParent.get(current) ?? []) {
      result.push(child);
      queue.push(child);
    }
  }
  return result;
}

/**
 * Walk from an item's group up to the root. Ancestor traversal is inherently
 * sequential (each step needs the previous row's parent_id); this is the single
 * shared implementation used by price-list resolution and default resolution.
 */
export async function walkGroupAncestors(
  db: Db,
  startGroupId: string | null | undefined,
): Promise<ProductsItemGroup[]> {
  const chain: ProductsItemGroup[] = [];
  let currentGroupId = startGroupId;
  // oxlint-disable eslint/no-await-in-loop
  while (currentGroupId !== null && currentGroupId !== undefined) {
    const [group] = await db
      .select()
      .from(productsItemGroup)
      .where(eq(productsItemGroup.id, currentGroupId))
      .limit(1);
    if (!group) {
      break;
    }
    chain.push(group);
    currentGroupId = group.parent_id;
  }
  // oxlint-enable eslint/no-await-in-loop
  return chain;
}

/** Nearest-ancestor-wins lookup over a chain returned by walkGroupAncestors. */
export function nearestAncestorValue<TValue>(
  chain: ProductsItemGroup[],
  pick: (group: ProductsItemGroup) => TValue | null | undefined,
): TValue | null {
  for (const group of chain) {
    const value = pick(group);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return null;
}
