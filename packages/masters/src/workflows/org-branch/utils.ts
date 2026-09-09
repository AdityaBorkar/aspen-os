import { orgBranch } from "#/db-schemas";
import type { OrgBranchTreeNode } from "#/schemas/org-branch";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";

type Db = WorkflowContext["db"];

const MAX_HIERARCHY_DEPTH = 5;

export async function ensureOrgBranchCodeUnique(
  db: Db,
  code: string,
  excludeId?: string,
): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions =
    excludeId === undefined
      ? [eq(orgBranch.code, upperCode)]
      : [eq(orgBranch.code, upperCode), ne(orgBranch.id, excludeId)];

  const [existing] = await db
    .select({ id: orgBranch.id })
    .from(orgBranch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Branch code "${upperCode}" already exists.`);
  }
}

export async function ensureNoHeadquartersExists(db: Db, excludeId?: string): Promise<void> {
  const conditions =
    excludeId === undefined
      ? [eq(orgBranch.type, "headquarters")]
      : [eq(orgBranch.type, "headquarters"), ne(orgBranch.id, excludeId)];

  const [existing] = await db
    .select({ id: orgBranch.id })
    .from(orgBranch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error("A headquarters branch already exists. Only one headquarters is allowed.");
  }
}

export async function validateParentOrgBranch(
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

    // SAFETY: the select projects only org_branch.parent_org_branch, so rows carry that shape.
    const [row] = (await db
      .select({ parentOrgBranch: orgBranch.parent_org_branch })
      .from(orgBranch)
      .where(eq(orgBranch.id, currentId))
      .limit(1)) as { parentOrgBranch: string | null }[];

    if (!row) {
      if (depth === 0) {
        throw new Error(`Parent branch with id "${parentId}" not found.`);
      }
      break;
    }

    currentId = row.parentOrgBranch;
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

export function buildOrgBranchTree(
  branches: { id: string; name: string; parentOrgBranch: string | null }[],
): OrgBranchTreeNode[] {
  const ids = new Set(branches.map((item) => item.id));
  const childrenByParent = new Map<string | null, typeof branches>();

  for (const item of branches) {
    // Promote orphans (missing parent not in the result set) to roots
    // instead of silently dropping their subtrees.
    const key =
      item.parentOrgBranch !== null && !ids.has(item.parentOrgBranch) ? null : item.parentOrgBranch;
    const group = childrenByParent.get(key) ?? [];
    group.push(item);
    childrenByParent.set(key, group);
  }

  const build = (parentId: string | null): OrgBranchTreeNode[] =>
    (childrenByParent.get(parentId) ?? []).map((item) => ({
      children: build(item.id),
      id: item.id,
      name: item.name,
    }));

  return build(null);
}
