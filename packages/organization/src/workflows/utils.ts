import { branch, organization } from "#/db-schemas";
import type { BranchTreeNode } from "#/types";

import type { JsonValue, WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";

type Db = WorkflowContext["db"];
type Pubsub = WorkflowContext["pubsub"];

const MAX_HIERARCHY_DEPTH = 5;
const SLUG_MAX_LENGTH = 63;
const DEFAULT_SLUG = "organization";

function normalizeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .replaceAll(/[\s_]+/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-|-$/g, "")
      .slice(0, SLUG_MAX_LENGTH)
      .replaceAll(/-$/g, "") || DEFAULT_SLUG
  );
}

export function generateSlug(name: string): string {
  return normalizeSlug(name);
}

export async function ensureSlugAvailable(db: Db, slug: string, excludeId?: string): Promise<void> {
  const conditions =
    excludeId === undefined
      ? [eq(organization.slug, slug)]
      : [eq(organization.slug, slug), ne(organization.id, excludeId)];

  const [existing] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Organization with slug "${slug}" already exists.`);
  }
}

export async function resolveUniqueSlug(db: Db, baseSlug: string): Promise<string> {
  const base = normalizeSlug(baseSlug);
  let slug = base;
  let suffix = 2;

  // oxlint-disable eslint/no-await-in-loop
  while (true) {
    const [existing] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!existing) {
      return slug;
    }

    const tail = `-${suffix}`;
    slug = `${base.slice(0, SLUG_MAX_LENGTH - tail.length)}${tail}`;
    suffix++;
  }
  // oxlint-enable eslint/no-await-in-loop
}

export async function ensureCodeUnique(db: Db, code: string, excludeId?: string): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions =
    excludeId === undefined
      ? [eq(branch.code, upperCode)]
      : [eq(branch.code, upperCode), ne(branch.id, excludeId)];

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Branch code "${upperCode}" already exists.`);
  }
}

export async function ensureNoHeadquartersExists(db: Db, excludeId?: string): Promise<void> {
  const conditions =
    excludeId === undefined
      ? [eq(branch.type, "headquarters")]
      : [eq(branch.type, "headquarters"), ne(branch.id, excludeId)];

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error("A headquarters branch already exists. Only one headquarters is allowed.");
  }
}

export async function validateParentBranch(
  db: Db,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId !== undefined && parentId === childId) {
    throw new Error("A branch cannot be its own parent.");
  }

  const seen = new Set<string>();
  let depth = 0;
  let currentId: string | null = parentId;

  // Single ancestor walk: verifies existence, detects cycles, measures depth.
  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (seen.has(currentId) || currentId === childId) {
      throw new Error("Setting this parent would create a circular reference.");
    }
    seen.add(currentId);

    const [row] = (await db
      .select({ parentBranch: branch.parent_branch })
      .from(branch)
      .where(eq(branch.id, currentId))
      .limit(1)) as { parentBranch: string | null }[];

    if (!row) {
      if (depth === 0) {
        throw new Error(`Parent branch with id "${parentId}" not found.`);
      }
      break;
    }

    currentId = row.parentBranch;
    if (currentId !== null) {
      depth++;
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  // The child would sit one level below this chain, so reject chains already at max-1.
  if (depth + 1 >= MAX_HIERARCHY_DEPTH) {
    throw new Error(
      `Cannot add a child to this branch. Maximum hierarchy depth of ${MAX_HIERARCHY_DEPTH} levels would be exceeded.`,
    );
  }
}

/** Shared active-flag transition for activate/deactivate/archive/restore. */
export async function setBranchActive(
  db: Db,
  pubsub: Pubsub,
  options: { date?: string; id: string; isActive: boolean; topic: string },
): Promise<typeof branch.$inferSelect> {
  const [updated] = await db
    .update(branch)
    .set({ is_active: options.isActive, updated_at: new Date() })
    .where(eq(branch.id, options.id))
    .returning();

  if (!updated) {
    throw new Error(`Branch with id "${options.id}" not found.`);
  }

  await pubsub.publish(
    options.topic,
    options.date === undefined
      ? { branchId: options.id }
      : { branchId: options.id, date: options.date },
  );

  return updated;
}

/** Defined-only entries of a values object (undefined means "column untouched"). */
export function collectChanges<TValue extends Record<string, JsonValue>>(
  obj: TValue,
): Partial<TValue> {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (value === undefined) {
      delete result[key];
    }
  }
  return result;
}

export function buildTree(
  branches: { id: string; name: string; parentBranch: string | null }[],
): BranchTreeNode[] {
  const ids = new Set(branches.map((item) => item.id));
  const childrenByParent = new Map<string | null, typeof branches>();

  for (const item of branches) {
    // Promote orphans (missing parent not in the result set) to roots
    // instead of silently dropping their subtrees.
    const key =
      item.parentBranch !== null && !ids.has(item.parentBranch) ? null : item.parentBranch;
    const group = childrenByParent.get(key) ?? [];
    group.push(item);
    childrenByParent.set(key, group);
  }

  const build = (parentId: string | null): BranchTreeNode[] =>
    (childrenByParent.get(parentId) ?? []).map((item) => ({
      children: build(item.id),
      id: item.id,
      name: item.name,
    }));

  return build(null);
}
