import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import type { PositionTreeNode } from "#/types";

import { and, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const MAX_POSITION_DEPTH = 10;

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchPositionById(db: NodePgDatabase, id: string) {
  const [result] = await db.select().from(hrPosition).where(eq(hrPosition.id, id)).limit(1);

  if (!result) {
    throw new Error(`Position with id "${id}" not found.`);
  }

  return result;
}

export async function ensurePositionNameUnique(
  db: NodePgDatabase,
  input: { department: string; excludeId?: string; name: string },
): Promise<void> {
  const conditions = [eq(hrPosition.name, input.name), eq(hrPosition.department, input.department)];
  if (input.excludeId) {
    conditions.push(sql`${hrPosition.id} != ${input.excludeId}`);
  }

  const [existing] = await db
    .select({ id: hrPosition.id })
    .from(hrPosition)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Position "${input.name}" already exists in department "${input.department}".`);
  }
}

export async function wouldCreatePositionCircular(
  db: NodePgDatabase,
  positionId: string,
  newReportsToId: string,
): Promise<boolean> {
  let currentId: string | null = newReportsToId;
  let depth = 0;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (currentId === positionId) {
      return true;
    }
    if (depth >= MAX_POSITION_DEPTH) {
      return true;
    }

    const [position] = await db
      .select({ reportsToPosition: hrPosition.reportsToPosition })
      .from(hrPosition)
      .where(eq(hrPosition.id, currentId))
      .limit(1);

    if (!position) {
      break;
    }
    currentId = position.reportsToPosition;
    depth++;
  }
  // oxlint-enable eslint/no-await-in-loop

  return false;
}

export async function validatePositionReportsTo(
  db: NodePgDatabase,
  reportsToId: string,
  childId?: string,
): Promise<void> {
  if (childId && reportsToId === childId) {
    throw new Error("A position cannot be its own parent.");
  }
  if (childId) {
    const wouldCycle = await wouldCreatePositionCircular(db, childId, reportsToId);
    if (wouldCycle) {
      throw new Error("Setting this parent position would create a circular reference.");
    }
  }
}

// ─── Assignments ─────────────────────────────────────────────────────────

export async function fetchPositionAssignmentById(db: NodePgDatabase, id: string) {
  const [result] = await db
    .select()
    .from(hrPositionAssignment)
    .where(eq(hrPositionAssignment.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Position assignment with id "${id}" not found.`);
  }

  return result;
}

export async function listOpenAssignmentsForPosition(db: NodePgDatabase, positionId: string) {
  return db
    .select()
    .from(hrPositionAssignment)
    .where(
      and(eq(hrPositionAssignment.positionId, positionId), isNull(hrPositionAssignment.toDate)),
    );
}

export async function ensurePositionHasCapacity(
  db: NodePgDatabase,
  positionId: string,
  excludingAssignmentId?: string,
): Promise<void> {
  const position = await fetchPositionById(db, positionId);
  const conditions = [
    eq(hrPositionAssignment.positionId, positionId),
    isNull(hrPositionAssignment.toDate),
  ];
  if (excludingAssignmentId) {
    conditions.push(sql`${hrPositionAssignment.id} != ${excludingAssignmentId}`);
  }

  const openAssignments = await db
    .select({ id: hrPositionAssignment.id })
    .from(hrPositionAssignment)
    .where(and(...conditions));

  if (openAssignments.length >= position.headcount) {
    throw new Error(
      `Position "${position.name}" has reached its headcount of ${position.headcount}.`,
    );
  }
}

export async function ensureNoOpenAssignmentForEmployeeInPosition(
  db: NodePgDatabase,
  employeeId: string,
  positionId: string,
): Promise<void> {
  const conditions = [
    eq(hrPositionAssignment.employeeId, employeeId),
    eq(hrPositionAssignment.positionId, positionId),
    isNull(hrPositionAssignment.toDate),
  ];

  const [existing] = await db
    .select({ id: hrPositionAssignment.id })
    .from(hrPositionAssignment)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Employee already has an open-ended assignment to position "${positionId}".`);
  }
}

export async function clearOtherCurrentPrimaryAssignments(
  db: NodePgDatabase,
  employeeId: string,
): Promise<void> {
  await db
    .update(hrPositionAssignment)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(
      and(
        eq(hrPositionAssignment.employeeId, employeeId),
        eq(hrPositionAssignment.isPrimary, true),
        isNull(hrPositionAssignment.toDate),
      ),
    );
}

export async function ensurePositionActive(db: NodePgDatabase, positionId: string): Promise<void> {
  const position = await fetchPositionById(db, positionId);
  if (!position.isActive) {
    throw new Error(`Position "${position.name}" is not active.`);
  }
}

export async function assertNoActiveAssignments(
  db: NodePgDatabase,
  positionId: string,
): Promise<void> {
  const openAssignments = await db
    .select({ id: hrPositionAssignment.id })
    .from(hrPositionAssignment)
    .where(
      and(eq(hrPositionAssignment.positionId, positionId), isNull(hrPositionAssignment.toDate)),
    )
    .limit(1);

  if (openAssignments.length > 0) {
    throw new Error(
      `Position "${positionId}" has active assignments and cannot be deactivated or deleted.`,
    );
  }
}

// ─── Manager resolution ───────────────────────────────────────────────────

export interface PositionChainData {
  incumbentsByPosition: Map<string, string[]>;
  parentByPosition: Map<string, string | null>;
}

export function buildPositionChainData(
  positions: { id: string; reportsToPosition: string | null }[],
  assignments: { employeeId: string; isPrimary: boolean; positionId: string }[],
): PositionChainData {
  const parentByPosition = new Map<string, string | null>();
  for (const position of positions) {
    parentByPosition.set(position.id, position.reportsToPosition);
  }

  const incumbentsByPosition = new Map<string, string[]>();
  for (const assignment of assignments) {
    const incumbents = incumbentsByPosition.get(assignment.positionId) ?? [];
    if (assignment.isPrimary) {
      incumbents.unshift(assignment.employeeId);
    } else {
      incumbents.push(assignment.employeeId);
    }
    incumbentsByPosition.set(assignment.positionId, incumbents);
  }

  return { incumbentsByPosition, parentByPosition };
}

export function resolveManagerFromChain(
  chain: PositionChainData,
  employee: { id: string; reportsTo: string | null },
  employeePositions: Map<string, string[]>,
): string | null {
  const positions = employeePositions.get(employee.id) ?? [];

  for (const positionId of positions) {
    let current = chain.parentByPosition.get(positionId) ?? null;
    let depth = 0;
    while (current !== null && depth <= MAX_POSITION_DEPTH) {
      const incumbents = chain.incumbentsByPosition.get(current) ?? [];
      const incumbent = incumbents.find((employeeId) => employeeId !== employee.id);
      if (incumbent) {
        return incumbent;
      }
      current = chain.parentByPosition.get(current) ?? null;
      depth++;
    }
  }

  return employee.reportsTo ?? null;
}

export async function resolveManagerIdMap(
  db: NodePgDatabase,
  employees: { id: string; reportsTo: string | null }[],
): Promise<Map<string, string | null>> {
  if (employees.length === 0) {
    return new Map();
  }

  const [positions, assignments] = await Promise.all([
    db.select().from(hrPosition),
    db.select().from(hrPositionAssignment).where(isNull(hrPositionAssignment.toDate)),
  ]);

  const chain = buildPositionChainData(positions, assignments);

  const employeePositions = new Map<string, string[]>();
  for (const assignment of assignments) {
    const list = employeePositions.get(assignment.employeeId) ?? [];
    list.push(assignment.positionId);
    employeePositions.set(assignment.employeeId, list);
  }

  return new Map(
    employees.map((employee) => [
      employee.id,
      resolveManagerFromChain(chain, employee, employeePositions),
    ]),
  );
}

// ─── Position tree ────────────────────────────────────────────────────────

export interface PositionTreeEmployee {
  designation: string;
  image: string | null;
  name: string;
}

export function buildPositionTree(
  positions: {
    branch: string | null;
    department: string;
    id: string;
    name: string;
    reportsToPosition: string | null;
  }[],
  incumbentsByPosition: Map<string, string[]>,
  employeeById: Map<string, PositionTreeEmployee>,
): PositionTreeNode[] {
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const included = new Set(positions.map((position) => position.id));
  const childrenByParent = new Map<string, string[]>();

  for (const position of positions) {
    const parent =
      position.reportsToPosition !== null && included.has(position.reportsToPosition)
        ? position.reportsToPosition
        : null;
    const key = parent ?? "__root__";
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(position.id);
    childrenByParent.set(key, siblings);
  }

  const build = (positionId: string): PositionTreeNode => {
    const position = positionById.get(positionId);
    const childIds = childrenByParent.get(positionId) ?? [];
    const incumbents = (incumbentsByPosition.get(positionId) ?? []).flatMap((employeeId) => {
      const employee = employeeById.get(employeeId);
      if (!employee) {
        return [];
      }
      return [
        {
          designation: employee.designation,
          employeeId,
          image: employee.image,
          name: employee.name,
        },
      ];
    });

    return {
      branch: position?.branch ?? null,
      children: childIds.map(build),
      department: position?.department ?? "",
      id: positionId,
      incumbents,
      name: position?.name ?? "",
    };
  };

  return (childrenByParent.get("__root__") ?? []).map(build);
}
