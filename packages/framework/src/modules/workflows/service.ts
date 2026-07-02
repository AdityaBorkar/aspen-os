import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "./schema";
import type { WorkflowExecution, WorkflowStatus } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createExecutionService(db: DrizzleDB) {
  async function create(
    workflowName: string,
    input: unknown,
    metadata: Record<string, unknown>,
  ): Promise<WorkflowExecution> {
    const [row] = await db
      .insert(s.workflowExecutions)
      .values({
        input: input as Record<string, unknown>,
        metadata,
        status: "running",
        workflowName,
      })
      .returning();

    return {
      currentStep: 0,
      id: row!.id,
      input: row!.input,
      startedAt: row!.startedAt,
      status: "running",
      workflowName: row!.workflowName,
    };
  }

  async function updateStep(executionId: string, step: number): Promise<void> {
    await db
      .update(s.workflowExecutions)
      .set({ currentStep: step })
      .where(eq(s.workflowExecutions.id, executionId));
  }

  async function complete(executionId: string, output: unknown): Promise<void> {
    await db
      .update(s.workflowExecutions)
      .set({
        completedAt: new Date(),
        output: output as Record<string, unknown>,
        status: "completed",
      })
      .where(eq(s.workflowExecutions.id, executionId));
  }

  async function fail(executionId: string, error: string): Promise<void> {
    await db
      .update(s.workflowExecutions)
      .set({ completedAt: new Date(), error, status: "failed" })
      .where(eq(s.workflowExecutions.id, executionId));
  }

  async function getById(
    executionId: string,
  ): Promise<WorkflowExecution | null> {
    const [row] = await db
      .select()
      .from(s.workflowExecutions)
      .where(eq(s.workflowExecutions.id, executionId))
      .limit(1);
    if (!row) return null;
    return toExecution(row);
  }

  async function list(
    workflowName?: string,
    limit = 50,
  ): Promise<WorkflowExecution[]> {
    const where = workflowName
      ? eq(s.workflowExecutions.workflowName, workflowName)
      : undefined;
    const rows = await db
      .select()
      .from(s.workflowExecutions)
      .where(where)
      .orderBy(desc(s.workflowExecutions.startedAt))
      .limit(limit);
    return rows.map(toExecution);
  }

  function toExecution(row: {
    id: string;
    workflowName: string;
    status: string;
    input: unknown;
    output: unknown;
    error: string | null;
    currentStep: number;
    startedAt: Date;
    completedAt: Date | null;
  }): WorkflowExecution {
    return {
      completedAt: row.completedAt ?? undefined,
      currentStep: row.currentStep,
      error: row.error ?? undefined,
      id: row.id,
      input: row.input,
      output: row.output,
      startedAt: row.startedAt,
      status: row.status as WorkflowStatus,
      workflowName: row.workflowName,
    };
  }

  return { complete, create, fail, getById, list, updateStep };
}
