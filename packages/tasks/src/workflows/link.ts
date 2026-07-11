import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { taskLink } from "../db-schema";
import { DependencyGraphService } from "../services/dependency-graph";
import type { CreateTaskLinkInput } from "../types";
import { CreateTaskLinkSchema } from "../types";

const INVERSE_LINK_TYPES: Record<string, string> = {
  blocked_by: "blocks",
  blocks: "blocked_by",
  caused_by: "caused_by",
  duplicates: "duplicates",
  related_to: "related_to",
  split_from: "split_from",
};

export class LinkWorkflow {
  private readonly graphService: DependencyGraphService;

  constructor(private readonly db: NodePgDatabase) {
    this.graphService = new DependencyGraphService(db);
  }

  async create(input: CreateTaskLinkInput) {
    const parsed = parse(CreateTaskLinkSchema, input);

    if (parsed.sourceId === parsed.targetId) {
      throw new Error("Cannot link a task to itself.");
    }

    if (parsed.linkType === "blocks") {
      const wouldCycle = await this.graphService.wouldCreateCycle(
        parsed.sourceId,
        parsed.targetId,
      );
      if (wouldCycle) {
        throw new Error(
          "Creating this link would introduce a circular dependency.",
        );
      }
    }

    const [existing] = await this.db
      .select({ id: taskLink.id })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, parsed.sourceId),
          eq(taskLink.targetId, parsed.targetId),
          eq(taskLink.linkType, parsed.linkType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("This task link already exists.");
    }

    const [result] = await this.db
      .insert(taskLink)
      .values({
        linkType: parsed.linkType,
        sourceId: parsed.sourceId,
        targetId: parsed.targetId,
      })
      .returning();

    const inverseType = INVERSE_LINK_TYPES[parsed.linkType];
    if (inverseType) {
      await this.createInverseLink(
        parsed.targetId,
        parsed.sourceId,
        inverseType,
      );
    }

    return result;
  }

  async delete(sourceId: string, targetId: string) {
    const [link] = await this.db
      .select()
      .from(taskLink)
      .where(
        and(eq(taskLink.sourceId, sourceId), eq(taskLink.targetId, targetId)),
      )
      .limit(1);

    if (!link) {
      throw new Error("Task link not found.");
    }

    await this.db.delete(taskLink).where(eq(taskLink.id, link.id));

    const inverseType = INVERSE_LINK_TYPES[link.linkType];
    if (inverseType) {
      await this.db
        .delete(taskLink)
        .where(
          and(
            eq(taskLink.sourceId, targetId),
            eq(taskLink.targetId, sourceId),
            eq(
              taskLink.linkType,
              inverseType as
                | "blocks"
                | "blocked_by"
                | "related_to"
                | "duplicates"
                | "caused_by"
                | "split_from",
            ),
          ),
        );
    }
  }

  async listByTask(taskId: string) {
    const outgoing = await this.db
      .select()
      .from(taskLink)
      .where(eq(taskLink.sourceId, taskId));

    const incoming = await this.db
      .select()
      .from(taskLink)
      .where(eq(taskLink.targetId, taskId));

    return { incoming, outgoing };
  }

  async topologicalSort(taskIds: string[]): Promise<string[]> {
    return this.graphService.topologicalSort(taskIds);
  }

  async getCriticalPath(projectId: string) {
    return this.graphService.getCriticalPath(projectId);
  }

  async getDependencyGraph(taskIds: string[]) {
    return this.graphService.buildDependencyGraph(taskIds);
  }

  private async createInverseLink(
    sourceId: string,
    targetId: string,
    linkType: string,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ id: taskLink.id })
      .from(taskLink)
      .where(
        and(
          eq(taskLink.sourceId, sourceId),
          eq(taskLink.targetId, targetId),
          eq(
            taskLink.linkType,
            linkType as
              | "blocks"
              | "blocked_by"
              | "related_to"
              | "duplicates"
              | "caused_by"
              | "split_from",
          ),
        ),
      )
      .limit(1);

    if (!existing) {
      await this.db.insert(taskLink).values({
        linkType: linkType as
          | "blocks"
          | "blocked_by"
          | "related_to"
          | "duplicates"
          | "caused_by"
          | "split_from",
        sourceId,
        targetId,
      });
    }
  }
}
