import { employee, hrPosition } from "#/db-schemas";
import type { DepartmentTreeNode, OrgTreeNode } from "#/types";
import type { Db } from "#/workflows/db";

import { count, eq } from "drizzle-orm";

// ─── Generic tree ────────────────────────────────────────────────────────────
// One parent-map implementation shared by every hierarchy in HR. Callers supply
// how to read the id/parent and how to build a node from an item + children.

interface TreeItem {
  id: string;
  parentId: string | null;
}

export function buildTree<TItem extends TreeItem, TNode>(
  items: TItem[],
  build: (item: TItem, children: TNode[]) => TNode,
): TNode[] {
  const knownIds = new Set(items.map((item) => item.id));
  const childrenByParent = new Map<string | null, TItem[]>();
  for (const item of items) {
    const parent = item.parentId !== null && knownIds.has(item.parentId) ? item.parentId : null;
    const siblings = childrenByParent.get(parent) ?? [];
    siblings.push(item);
    childrenByParent.set(parent, siblings);
  }

  const visit = (item: TItem): TNode =>
    build(item, (childrenByParent.get(item.id) ?? []).map(visit));

  return (childrenByParent.get(null) ?? []).map(visit);
}

function pruneTree<TNode extends { children: TNode[] }>(
  nodes: TNode[],
  depth: number | undefined,
): TNode[] {
  if (depth === undefined) {
    return nodes;
  }
  if (depth <= 0) {
    return nodes.map((node) => ({ ...node, children: [] }));
  }
  return nodes.map((node) => ({ ...node, children: pruneTree(node.children, depth - 1) }));
}

export function collectSubtreeIds(
  items: { id: string; parentId: string | null }[],
  rootIds: string[],
): string[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item.id);
    childrenByParent.set(item.parentId, siblings);
  }

  const result = new Set<string>(rootIds);
  const stack = [...rootIds];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }
  return [...result];
}

function findInForest<TNode extends { children: TNode[]; id: string }>(
  forest: TNode[],
  id: string,
): TNode | null {
  const queue = [...forest];
  for (const node of queue) {
    if (node.id === id) {
      return node;
    }
    queue.push(...node.children);
  }
  return null;
}

// ─── Org chart ───────────────────────────────────────────────────────────────

export interface EmployeeChartRow {
  department: string;
  designation: string;
  firstName: string;
  id: string;
  image: string | null;
  lastName: string;
  position: string | null;
  reportsTo: string | null;
}

export function buildEmployeeTree(
  employees: EmployeeChartRow[],
  parentId: string | null,
): OrgTreeNode[] {
  const rooted: (EmployeeChartRow & TreeItem)[] = employees.map((employeeItem) => ({
    ...employeeItem,
    parentId: employeeItem.reportsTo,
  }));
  const forest = buildTree<EmployeeChartRow & TreeItem, OrgTreeNode>(
    rooted,
    (employeeItem, children) => ({
      children,
      department: employeeItem.department,
      designation: employeeItem.designation,
      id: employeeItem.id,
      image: employeeItem.image,
      name: `${employeeItem.firstName} ${employeeItem.lastName}`.trim(),
      position: employeeItem.position,
    }),
  );
  if (parentId === null) {
    return forest;
  }
  return findInForest(forest, parentId)?.children ?? [];
}

// ─── Department tree ─────────────────────────────────────────────────────────

export interface DepartmentCounts {
  employeeCountByDepartment: Map<string, number>;
  positionCountByDepartment: Map<string, number>;
}

export async function getDepartmentCounts(db: Db): Promise<DepartmentCounts> {
  const [employeeCounts, positionCounts] = await Promise.all([
    db
      .select({ count: count(), departmentId: employee.department })
      .from(employee)
      .where(eq(employee.status, "active"))
      .groupBy(employee.department),
    db
      .select({ count: count(), departmentId: hrPosition.department })
      .from(hrPosition)
      .where(eq(hrPosition.isActive, true))
      .groupBy(hrPosition.department),
  ]);

  return {
    employeeCountByDepartment: new Map(employeeCounts.map((row) => [row.departmentId, row.count])),
    positionCountByDepartment: new Map(positionCounts.map((row) => [row.departmentId, row.count])),
  };
}

export function buildDepartmentTree(
  departments: {
    code: string;
    id: string;
    manager: string | null;
    name: string;
    parentDepartment: string | null;
  }[],
  counts: DepartmentCounts,
  options?: { depth?: number; rootIds?: Set<string> },
): DepartmentTreeNode[] {
  const rooted = departments.map((departmentItem) => ({
    ...departmentItem,
    parentId: departmentItem.parentDepartment,
  }));
  const forest: DepartmentTreeNode[] = buildTree(rooted, (departmentItem, children) => ({
    children,
    code: departmentItem.code,
    employeeCount: counts.employeeCountByDepartment.get(departmentItem.id) ?? 0,
    headEmployeeId: departmentItem.manager,
    id: departmentItem.id,
    name: departmentItem.name,
    positionCount: counts.positionCountByDepartment.get(departmentItem.id) ?? 0,
  }));

  if (!options?.rootIds) {
    return pruneTree(forest, options?.depth);
  }
  const wanted = options.rootIds;
  const matches: DepartmentTreeNode[] = [];
  const queue = [...forest];
  for (const node of queue) {
    if (wanted.has(node.id)) {
      matches.push(node);
    } else {
      queue.push(...node.children);
    }
  }
  return pruneTree(matches, options.depth);
}
