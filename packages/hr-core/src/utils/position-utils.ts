import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import type { PositionTreeNode } from "#/types";
import type { Db } from "#/workflows/db";

import { and, eq, isNull, sql } from "drizzle-orm";

const MAX_POSITION_DEPTH = 10;

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchPositionById(db: Db, id: string) {
  const [result] = await db.select().from(hrPosition).where(eq(hrPosition.id, id)).limit(1);

  if (!result) {
    throw new Error(`Position with id "${id}" not found.`);
  }

  return result;
}

export async function ensurePositionNameUnique(
  db: Db,
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
  db: Db,
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
      .select({ reportsToPosition: hrPosition.reports_to_position })
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
  db: Db,
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

export async function fetchPositionAssignmentById(db: Db, id: string) {
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

export async function listOpenAssignmentsForPosition(db: Db, positionId: string) {
  return db
    .select()
    .from(hrPositionAssignment)
    .where(
      and(eq(hrPositionAssignment.position_id, positionId), isNull(hrPositionAssignment.to_date)),
    );
}

export async function ensurePositionHasCapacity(
  db: Db,
  positionId: string,
  excludingAssignmentId?: string,
): Promise<void> {
  const position = await fetchPositionById(db, positionId);
  const conditions = [
    eq(hrPositionAssignment.position_id, positionId),
    isNull(hrPositionAssignment.to_date),
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
  db: Db,
  employeeId: string,
  positionId: string,
): Promise<void> {
  const conditions = [
    eq(hrPositionAssignment.employee_id, employeeId),
    eq(hrPositionAssignment.position_id, positionId),
    isNull(hrPositionAssignment.to_date),
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
  db: Db,
  employeeId: string,
): Promise<void> {
  await db
    .update(hrPositionAssignment)
    .set({ is_primary: false, updated_at: new Date() })
    .where(
      and(
        eq(hrPositionAssignment.employee_id, employeeId),
        eq(hrPositionAssignment.is_primary, true),
        isNull(hrPositionAssignment.to_date),
      ),
    );
}

// ─── Assignment core ─────────────────────────────────────────────────────────
// Shared by assign / transfer / reconciliation so the conflict-close → clear
// primary → capacity-check sequence lives in exactly one place.

export async function closeConflictingAssignment(
  db: Db,
  assignment: { employeeId: string; positionId: string; toDate: string },
): Promise<void> {
  await db
    .update(hrPositionAssignment)
    .set({ to_date: assignment.toDate, updated_at: new Date() })
    .where(
      and(
        eq(hrPositionAssignment.employee_id, assignment.employeeId),
        eq(hrPositionAssignment.position_id, assignment.positionId),
        isNull(hrPositionAssignment.to_date),
      ),
    );
}

export async function ensureAssignable(
  db: Db,
  assignment: { employeeId: string; isPrimary?: boolean; positionId: string },
): Promise<void> {
  if (assignment.isPrimary) {
    await clearOtherCurrentPrimaryAssignments(db, assignment.employeeId);
  }
  await ensurePositionHasCapacity(db, assignment.positionId);
  await ensureNoOpenAssignmentForEmployeeInPosition(
    db,
    assignment.employeeId,
    assignment.positionId,
  );
}

export async function ensurePositionActive(db: Db, positionId: string) {
  const position = await fetchPositionById(db, positionId);
  if (!position.is_active) {
    throw new Error(`Position "${position.name}" is not active.`);
  }
  return position;
}

export async function assertNoActiveAssignments(db: Db, positionId: string): Promise<void> {
  const openAssignments = await db
    .select({ id: hrPositionAssignment.id })
    .from(hrPositionAssignment)
    .where(
      and(eq(hrPositionAssignment.position_id, positionId), isNull(hrPositionAssignment.to_date)),
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
  positions: { id: string; reports_to_position: string | null }[],
  assignments: { employee_id: string; is_primary: boolean; position_id: string }[],
): PositionChainData {
  const parentByPosition = new Map<string, string | null>();
  for (const position of positions) {
    parentByPosition.set(position.id, position.reports_to_position);
  }

  const incumbentsByPosition = new Map<string, string[]>();
  for (const assignment of assignments) {
    const incumbents = incumbentsByPosition.get(assignment.position_id) ?? [];
    if (assignment.is_primary) {
      incumbents.unshift(assignment.employee_id);
    } else {
      incumbents.push(assignment.employee_id);
    }
    incumbentsByPosition.set(assignment.position_id, incumbents);
  }

  return { incumbentsByPosition, parentByPosition };
}

export function resolveManagerFromChain(
  chain: PositionChainData,
  employee: { id: string; reports_to: string | null },
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

  return employee.reports_to ?? null;
}

export async function resolveManagerIdMap(
  db: Db,
  employees: { id: string; reports_to: string | null }[],
): Promise<Map<string, string | null>> {
  if (employees.length === 0) {
    return new Map();
  }

  const [positions, assignments] = await Promise.all([
    db.select().from(hrPosition),
    db.select().from(hrPositionAssignment).where(isNull(hrPositionAssignment.to_date)),
  ]);

  const chain = buildPositionChainData(positions, assignments);

  const employeePositions = new Map<string, string[]>();
  for (const assignment of assignments) {
    const list = employeePositions.get(assignment.employee_id) ?? [];
    list.push(assignment.position_id);
    employeePositions.set(assignment.employee_id, list);
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
    reports_to_position: string | null;
  }[],
  incumbentsByPosition: Map<string, string[]>,
  employeeById: Map<string, PositionTreeEmployee>,
): PositionTreeNode[] {
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const included = new Set(positions.map((position) => position.id));
  const childrenByParent = new Map<string | null, string[]>();

  for (const position of positions) {
    const parent =
      position.reports_to_position !== null && included.has(position.reports_to_position)
        ? position.reports_to_position
        : null;
    const siblings = childrenByParent.get(parent) ?? [];
    siblings.push(position.id);
    childrenByParent.set(parent, siblings);
  }

  const build = (positionId: string): PositionTreeNode => {
    const position = positionById.get(positionId);
    const childIds = childrenByParent.get(positionId) ?? [];
    const incumbents: PositionTreeNode["incumbents"] = [];
    for (const employeeId of incumbentsByPosition.get(positionId) ?? []) {
      const employee = employeeById.get(employeeId);
      if (employee) {
        incumbents.push({
          designation: employee.designation,
          employeeId,
          image: employee.image,
          name: employee.name,
        });
      }
    }

    return {
      branch: position?.branch ?? null,
      children: childIds.map(build),
      department: position?.department ?? "",
      id: positionId,
      incumbents,
      name: position?.name ?? "",
    };
  };

  return (childrenByParent.get(null) ?? []).map(build);
}
