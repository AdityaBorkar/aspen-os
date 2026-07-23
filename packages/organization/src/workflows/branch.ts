import { isValidCountryCode } from "@aspen-os/constants";
import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { branch } from "../db-schemas";
import { BRANCH_EVENTS } from "../pubsub-events";
import type {
  BranchFilters,
  BranchTreeNode,
  CreateBranchInput,
  UpdateBranchInput,
} from "../types";
import {
  BranchFiltersSchema,
  CreateBranchSchema,
  UpdateBranchSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const MAX_HIERARCHY_DEPTH = 5;

const CreateInputSchema = object({ input: CreateBranchSchema });

async function ensureCodeUnique(
  db: DrizzleDB,
  code: string,
  excludeId?: string,
): Promise<void> {
  const upperCode = code.toUpperCase();
  const conditions = [eq(branch.code, upperCode)];
  if (excludeId) {
    conditions.push(sql`${branch.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Branch code "${upperCode}" already exists.`);
  }
}

async function ensureNoHeadquartersExists(
  db: DrizzleDB,
  excludeId?: string,
): Promise<void> {
  const conditions = [eq(branch.type, "headquarters")];
  if (excludeId) {
    conditions.push(sql`${branch.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(
      "A headquarters branch already exists. Only one headquarters is allowed.",
    );
  }
}

async function getDepth(db: DrizzleDB, branchId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = branchId;

  while (currentId !== null) {
    const [row] = await db
      .select({ parentBranch: branch.parentBranch })
      .from(branch)
      .where(eq(branch.id, currentId))
      .limit(1);

    if (!row?.parentBranch) break;
    currentId = row.parentBranch;
    depth++;

    if (depth > MAX_HIERARCHY_DEPTH) {
      throw new Error(
        `Branch hierarchy exceeds maximum depth of ${MAX_HIERARCHY_DEPTH}`,
      );
    }
  }

  return depth;
}

async function wouldCreateCircular(
  db: DrizzleDB,
  branchId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  let depth = 0;

  while (currentId !== null) {
    if (currentId === branchId) return true;
    if (depth >= MAX_HIERARCHY_DEPTH) return true;

    const [row] = await db
      .select({ parentBranch: branch.parentBranch })
      .from(branch)
      .where(eq(branch.id, currentId))
      .limit(1);

    if (!row) break;
    currentId = row.parentBranch;
    depth++;
  }

  return false;
}

async function validateParentBranch(
  db: DrizzleDB,
  parentId: string,
  childId?: string,
): Promise<void> {
  if (childId) {
    const circular = await wouldCreateCircular(db, childId, parentId);
    if (circular) {
      throw new Error("Setting this parent would create a circular reference.");
    }
  }

  const depth = await getDepth(db, parentId);
  if (depth >= MAX_HIERARCHY_DEPTH - 1) {
    throw new Error(
      `Cannot add a child to this branch. Maximum hierarchy depth of ${MAX_HIERARCHY_DEPTH} levels would be exceeded.`,
    );
  }
}

const fetchBranchStep = WorkflowStep.name("fetch-branch").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(branch)
      .where(eq(branch.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createBranch = Workflow.name("branch.create").handler(
  async (input: { input: CreateBranchInput }, ctx) => {
    const { input: parsed } = parse(CreateInputSchema, input);

    if (!isValidCountryCode(parsed.country)) {
      throw new Error(
        `Invalid country code: "${parsed.country}". Must be ISO 3166-1 alpha-2.`,
      );
    }

    if (parsed.type === "headquarters") {
      await ensureNoHeadquartersExists(ctx.db);
    }

    if (parsed.parentBranch) {
      await validateParentBranch(ctx.db, parsed.parentBranch);
    }

    const [result] = await ctx.db
      .insert(branch)
      .values({
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2 ?? null,
        capacity: parsed.capacity ?? null,
        city: parsed.city,
        closedDate: parsed.closedDate?.toISOString().split("T")[0] ?? null,
        code: parsed.code.toUpperCase(),
        country: parsed.country.toUpperCase(),
        email: parsed.email ?? null,
        manager: parsed.manager ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        notes: parsed.notes ?? null,
        openedDate: parsed.openedDate?.toISOString().split("T")[0] ?? null,
        parentBranch: parsed.parentBranch ?? null,
        phone: parsed.phone ?? null,
        postalCode: parsed.postalCode ?? null,
        state: parsed.state ?? null,
        timezone: parsed.timezone ?? null,
        type: parsed.type,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create branch.");
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
      branch: {
        code: result.code,
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  },
);

const updateBranch = Workflow.name("branch.update").handler(
  async (input: { id: string; patch: UpdateBranchInput }, ctx) => {
    const current = await ctx.step.run(fetchBranchStep, { id: input.id });
    const parsed = parse(UpdateBranchSchema, input.patch);

    if (parsed.code !== undefined) {
      await ensureCodeUnique(ctx.db, parsed.code, input.id);
    }

    if (parsed.country !== undefined && !isValidCountryCode(parsed.country)) {
      throw new Error(
        `Invalid country code: "${parsed.country}". Must be ISO 3166-1 alpha-2.`,
      );
    }

    if (parsed.type === "headquarters" && current.type !== "headquarters") {
      await ensureNoHeadquartersExists(ctx.db, input.id);
    }

    if (parsed.parentBranch !== undefined && parsed.parentBranch !== null) {
      if (parsed.parentBranch === input.id) {
        throw new Error("A branch cannot be its own parent.");
      }
      await validateParentBranch(ctx.db, parsed.parentBranch, input.id);
    }

    const [updated] = await ctx.db
      .update(branch)
      .set({
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2,
        capacity: parsed.capacity,
        city: parsed.city,
        closedDate: parsed.closedDate?.toISOString().split("T")[0] ?? undefined,
        code: parsed.code?.toUpperCase(),
        country: parsed.country?.toUpperCase(),
        email: parsed.email,
        isActive: parsed.isActive,
        manager: parsed.manager,
        metadata: parsed.metadata,
        name: parsed.name,
        notes: parsed.notes,
        openedDate: parsed.openedDate?.toISOString().split("T")[0] ?? undefined,
        parentBranch: parsed.parentBranch,
        phone: parsed.phone,
        postalCode: parsed.postalCode,
        state: parsed.state,
        timezone: parsed.timezone,
        type: parsed.type,
        updatedAt: new Date(),
      })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.UPDATED, {
      branch: { id: updated.id, name: updated.name },
      changes: parsed as Record<string, unknown>,
    });

    return updated;
  },
);

const activateBranch = Workflow.name("branch.activate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.ACTIVATED, {
      branchId: input.id,
    });

    return updated;
  },
);

const deactivateBranch = Workflow.name("branch.deactivate").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.DEACTIVATED, {
      branchId: input.id,
    });

    return updated;
  },
);

const closeBranch = Workflow.name("branch.close").handler(
  async (input: { id: string; date: Date }, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({
        closedDate: input.date.toISOString().split("T")[0],
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CLOSED, {
      branchId: input.id,
      date: input.date.toISOString().split("T")[0],
    });

    return updated;
  },
);

const archiveBranch = Workflow.name("branch.archive").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    return updated;
  },
);

const restoreBranch = Workflow.name("branch.restore").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    return updated;
  },
);

const listBranches = Workflow.name("branch.list").handler(
  async (input: { filters?: BranchFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(BranchFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(branch.type, parsed.type));
      }
      if (parsed.isActive !== undefined) {
        conditions.push(eq(branch.isActive, parsed.isActive));
      }
      if (parsed.country) {
        conditions.push(eq(branch.country, parsed.country.toUpperCase()));
      }
      if (parsed.parentBranch) {
        conditions.push(eq(branch.parentBranch, parsed.parentBranch));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(branch).where(whereClause);
    });
  },
);

const getBranch = Workflow.name("branch.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchBranchStep, { id: input.id });
  },
);

const getBranchTree = Workflow.name("branch.tree").handler(
  async (_input: Record<string, never>, ctx) => {
    return ctx.step.run("query", async () => {
      const allBranches = await ctx.db
        .select({
          id: branch.id,
          name: branch.name,
          parentBranch: branch.parentBranch,
        })
        .from(branch)
        .where(eq(branch.isActive, true));

      return buildTree(allBranches, null);
    });
  },
);

function buildTree(
  branches: { id: string; name: string; parentBranch: string | null }[],
  parentId: string | null,
): BranchTreeNode[] {
  return branches
    .filter((b) => b.parentBranch === parentId)
    .map((b) => ({
      children: buildTree(branches, b.id),
      id: b.id,
      name: b.name,
    }));
}

export const branches = {
  activate: activateBranch,
  archive: archiveBranch,
  close: closeBranch,
  create: createBranch,
  deactivate: deactivateBranch,
  get: getBranch,
  list: listBranches,
  restore: restoreBranch,
  tree: getBranchTree,
  update: updateBranch,
};
