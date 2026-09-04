import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import { LIFECYCLE_EVENTS, POSITION_EVENTS } from "#/pubsub";
import type { Db } from "#/workflows/db";
import { fetchSeparationById, fetchTransferById } from "#/workflows/fetch";

import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, safeParse, string } from "valibot";

export interface ReconciliationDeps {
  db: Db;
  pubsub: PubSubUnit;
}

const SeparationCompletedEventSchema = object({
  employeeId: string(),
  separationId: string(),
});

const TransferApprovedEventSchema = object({
  approvedBy: string(),
  employeeId: string(),
  transferId: string(),
});

async function closeAssignments(
  tx: Db,
  assignments: { id: string }[],
  toDate: string,
): Promise<{ positionId: string }[]> {
  const updates = await Promise.all(
    assignments.map(async (assignment) => {
      const [updated] = await tx
        .update(hrPositionAssignment)
        .set({ toDate, updatedAt: new Date() })
        .where(and(eq(hrPositionAssignment.id, assignment.id), isNull(hrPositionAssignment.toDate)))
        .returning();
      return updated;
    }),
  );
  return updates.filter((updated) => updated !== undefined);
}

async function publishUnassigned(
  pubsub: PubSubUnit,
  assignments: { positionId: string }[],
  event: { employeeId: string; toDate: string },
): Promise<void> {
  await Promise.all(
    assignments.map((assignment) =>
      pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
        employeeId: event.employeeId,
        positionId: assignment.positionId,
        toDate: event.toDate,
      }),
    ),
  );
}
async function handleSeparationCompleted(
  event: { employeeId: string; separationId: string },
  { db, pubsub }: ReconciliationDeps,
): Promise<void> {
  const separation = await fetchSeparationById(db, event.separationId);

  const closed = await db.transaction(async (tx) => {
    const openAssignments = await tx
      .select()
      .from(hrPositionAssignment)
      .where(
        and(
          eq(hrPositionAssignment.employeeId, event.employeeId),
          isNull(hrPositionAssignment.toDate),
        ),
      );

    return closeAssignments(tx, openAssignments, separation.exitDate);
  });

  await publishUnassigned(pubsub, closed, {
    employeeId: event.employeeId,
    toDate: separation.exitDate,
  });
}

async function handleTransferApproved(
  event: { employeeId: string; transferId: string },
  { db, pubsub }: ReconciliationDeps,
): Promise<void> {
  const transfer = await fetchTransferById(db, event.transferId);
  if (!transfer.fromDepartment) {
    return;
  }

  const closed = await db.transaction(async (tx) => {
    const openAssignments = await tx
      .select({
        assignmentId: hrPositionAssignment.id,
        department: hrPosition.department,
        positionId: hrPositionAssignment.positionId,
      })
      .from(hrPositionAssignment)
      .innerJoin(hrPosition, eq(hrPositionAssignment.positionId, hrPosition.id))
      .where(
        and(
          eq(hrPositionAssignment.employeeId, event.employeeId),
          isNull(hrPositionAssignment.toDate),
        ),
      );

    const stale = openAssignments.filter(
      (assignment) => assignment.department === transfer.fromDepartment,
    );

    return closeAssignments(
      tx,
      stale.map((assignment) => ({ id: assignment.assignmentId })),
      transfer.effectiveDate,
    );
  });

  await publishUnassigned(pubsub, closed, {
    employeeId: event.employeeId,
    toDate: transfer.effectiveDate,
  });
}

export async function registerReconciliation(deps: ReconciliationDeps): Promise<string[]> {
  const topics: string[] = [];

  await deps.pubsub.subscribe(LIFECYCLE_EVENTS.SEPARATION_COMPLETED, async (message) => {
    const parsed = safeParse(SeparationCompletedEventSchema, message.data);
    if (parsed.success) {
      await handleSeparationCompleted(parsed.output, deps);
    }
  });
  topics.push(LIFECYCLE_EVENTS.SEPARATION_COMPLETED);

  await deps.pubsub.subscribe(LIFECYCLE_EVENTS.TRANSFER_APPROVED, async (message) => {
    const parsed = safeParse(TransferApprovedEventSchema, message.data);
    if (parsed.success) {
      await handleTransferApproved(parsed.output, deps);
    }
  });
  topics.push(LIFECYCLE_EVENTS.TRANSFER_APPROVED);

  return topics;
}

export async function unregisterReconciliation(
  topics: string[],
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await pubsub.unsubscribe(topic);
      } catch {
        // Ignore — topic may not be registered
      }
    }),
  );
}
