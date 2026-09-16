import { healthcareQueueToken } from "#/db-schemas/appointments";
import { QueueQuerySchema } from "#/schemas/appointments";
import { toQueueTokenDto } from "#/workflow-steps/fetch-appointment";
import { QUEUE_BOARD_STATUSES, boardBranchOf } from "#/workflows/shared/board-query";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const QueueBoardInputSchema = object({ input: QueueQuerySchema });

export const queueBoard = Workflow.name("healthcare.appointments.queue-board")
  .input(QueueBoardInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(QueueQuerySchema, input);
    const branchId = boardBranchOf(parsed.branchId);
    const rows = await ctx.step.run("fetch-board", async () =>
      ctx.db
        .select()
        .from(healthcareQueueToken)
        .where(
          and(
            eq(healthcareQueueToken.branch_id, branchId),
            inArray(healthcareQueueToken.status, [...QUEUE_BOARD_STATUSES]),
          ),
        )
        .orderBy(asc(healthcareQueueToken.token_no)),
    );
    return rows.map(toQueueTokenDto);
  });
