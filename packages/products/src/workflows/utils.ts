import { productsItem, productsItemGroup } from "#/db-schemas";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";

type Db = WorkflowContext["db"];

export async function assertItemCodeUnique(
  db: Db,
  itemCode: string,
  excludeId?: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: productsItem.id })
    .from(productsItem)
    .where(
      and(
        eq(productsItem.item_code, itemCode),
        excludeId ? ne(productsItem.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(`Item code "${itemCode}" already exists.`);
  }
}

export async function assertBarcodeUnique(
  db: Db,
  barcode: string,
  excludeId?: string,
): Promise<void> {
  const { productsBarcode } = await import("#/db-schemas");
  const [existing] = await db
    .select({ id: productsBarcode.id })
    .from(productsBarcode)
    .where(
      and(
        eq(productsBarcode.barcode, barcode),
        excludeId ? ne(productsBarcode.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(`Barcode "${barcode}" already exists.`);
  }
}

export function cleanDescriptionHtml(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, "");
  const withoutTags = withoutStyles
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutTags.length === 0) {
    return null;
  }
  return withoutTags;
}

export function buildVariantKey(attributes: Record<string, string>): string {
  const keys = Object.keys(attributes).toSorted();
  return keys.map((key) => `${key}=${attributes[key] ?? ""}`).join("|");
}

export function expandCombinations(
  valuesByAttribute: Record<string, string[]>,
): Record<string, string>[] {
  const entries = Object.entries(valuesByAttribute);
  if (entries.length === 0) {
    return [];
  }
  let combos: Record<string, string>[] = [{}];
  for (const [attribute, values] of entries) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of values) {
        next.push({ ...combo, [attribute]: value });
      }
    }
    combos = next;
  }
  return combos;
}

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

export function generateNamingSeriesCode(prefix: string | null): string {
  const now = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  const head = prefix && prefix.length > 0 ? prefix : "ITEM";
  return `${head}-${now}${random}`;
}
