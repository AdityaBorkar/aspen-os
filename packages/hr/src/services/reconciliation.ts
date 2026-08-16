import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import { LIFECYCLE_EVENTS, POSITION_EVENTS } from "#/pubsub";
import { fetchSeparationById, fetchTransferById } from "#/workflows/utils";

import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, safeParse, string } from "valibot";

export interface ReconciliationDeps {
  db: NodePgDatabase;
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

async function handleSeparationCompleted(
  event: { employeeId: string; separationId: string },
  { db, pubsub }: ReconciliationDeps,
): Promise<void> {
  const separation = await fetchSeparationById(db, event.separationId);

  const openAssignments = await db
    .select()
    .from(hrPositionAssignment)
    .where(
      and(
        eq(hrPositionAssignment.employeeId, event.employeeId),
        isNull(hrPositionAssignment.toDate),
      ),
    );

  await Promise.all(
    openAssignments.map(async (assignment) => {
      const [updated] = await db
        .update(hrPositionAssignment)
        .set({ toDate: separation.exitDate, updatedAt: new Date() })
        .where(and(eq(hrPositionAssignment.id, assignment.id), isNull(hrPositionAssignment.toDate)))
        .returning();

      if (updated) {
        await pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
          employeeId: event.employeeId,
          positionId: assignment.positionId,
          toDate: separation.exitDate,
        });
      }
    }),
  );
}

async function handleTransferApproved(
  event: { employeeId: string; transferId: string },
  { db }: ReconciliationDeps,
): Promise<void> {
  const transfer = await fetchTransferById(db, event.transferId);

  const currentAssignments = await db
    .select({
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

  const oldDepartmentPositions = currentAssignments.filter(
    (assignment) => assignment.department === transfer.fromDepartment,
  );

  if (oldDepartmentPositions.length > 0) {
    console.warn(
      `[hr:reconciliation] Transfer guidance: employee "${event.employeeId}" holds position(s) ` +
        `${oldDepartmentPositions.map((assignment) => assignment.positionId).join(", ")} in ` +
        `department "${transfer.fromDepartment}"; consider transferring to a position in ` +
        `department "${transfer.toDepartment}".`,
    );
  }
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
