import { isValidCountryCode } from "@aspen-os/constants";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { branch } from "../db-schema";
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

const MAX_HIERARCHY_DEPTH = 5;

export class BranchWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateBranchInput) {
    const parsed = parse(CreateBranchSchema, input);

    if (!isValidCountryCode(parsed.country)) {
      throw new Error(
        `Invalid country code: "${parsed.country}". Must be ISO 3166-1 alpha-2.`,
      );
    }

    if (parsed.type === "headquarters") {
      await this.ensureNoHeadquartersExists();
    }

    if (parsed.parentBranch) {
      await this.validateParentBranch(parsed.parentBranch);
    }

    const [result] = await this.db
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

    return result;
  }

  async update(id: string, patch: UpdateBranchInput) {
    const current = await this.getById(id);
    const parsed = parse(UpdateBranchSchema, patch);

    if (parsed.code !== undefined) {
      await this.ensureCodeUnique(parsed.code, id);
    }

    if (parsed.country !== undefined && !isValidCountryCode(parsed.country)) {
      throw new Error(
        `Invalid country code: "${parsed.country}". Must be ISO 3166-1 alpha-2.`,
      );
    }

    if (parsed.type === "headquarters" && current.type !== "headquarters") {
      await this.ensureNoHeadquartersExists(id);
    }

    if (parsed.parentBranch !== undefined && parsed.parentBranch !== null) {
      if (parsed.parentBranch === id) {
        throw new Error("A branch cannot be its own parent.");
      }
      await this.validateParentBranch(parsed.parentBranch, id);
    }

    const [updated] = await this.db
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
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async activate(id: string) {
    const [updated] = await this.db
      .update(branch)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async deactivate(id: string) {
    const [updated] = await this.db
      .update(branch)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async close(id: string, date: Date) {
    const [updated] = await this.db
      .update(branch)
      .set({
        closedDate: date.toISOString().split("T")[0],
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async archive(id: string) {
    const [updated] = await this.db
      .update(branch)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async restore(id: string) {
    const [updated] = await this.db
      .update(branch)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(branch.id, id))
      .returning();

    return updated;
  }

  async list(filters?: BranchFilters) {
    const parsed = filters ? parse(BranchFiltersSchema, filters) : {};
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(branch).where(whereClause);
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(branch)
      .where(eq(branch.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Branch with id "${id}" not found.`);
    }

    return result;
  }

  async getTree(): Promise<BranchTreeNode[]> {
    const allBranches = await this.db
      .select({
        id: branch.id,
        name: branch.name,
        parentBranch: branch.parentBranch,
      })
      .from(branch)
      .where(eq(branch.isActive, true));

    return this.buildTree(allBranches, null);
  }

  private buildTree(
    branches: { id: string; name: string; parentBranch: string | null }[],
    parentId: string | null,
  ): BranchTreeNode[] {
    return branches
      .filter((b) => b.parentBranch === parentId)
      .map((b) => ({
        children: this.buildTree(branches, b.id),
        id: b.id,
        name: b.name,
      }));
  }

  private async ensureCodeUnique(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const upperCode = code.toUpperCase();
    const conditions = [eq(branch.code, upperCode)];
    if (excludeId) {
      conditions.push(sql`${branch.id} != ${excludeId}`);
    }

    const [existing] = await this.db
      .select({ id: branch.id })
      .from(branch)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new Error(`Branch code "${upperCode}" already exists.`);
    }
  }

  private async ensureNoHeadquartersExists(excludeId?: string): Promise<void> {
    const conditions = [eq(branch.type, "headquarters")];
    if (excludeId) {
      conditions.push(sql`${branch.id} != ${excludeId}`);
    }

    const [existing] = await this.db
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

  private async validateParentBranch(
    parentId: string,
    childId?: string,
  ): Promise<void> {
    if (childId) {
      const wouldCycle = await this.wouldCreateCircular(childId, parentId);
      if (wouldCycle) {
        throw new Error(
          "Setting this parent would create a circular reference.",
        );
      }
    }

    const depth = await this.getDepth(parentId);
    if (depth >= MAX_HIERARCHY_DEPTH - 1) {
      throw new Error(
        `Cannot add a child to this branch. Maximum hierarchy depth of ${MAX_HIERARCHY_DEPTH} levels would be exceeded.`,
      );
    }
  }

  private async wouldCreateCircular(
    branchId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;
    let depth = 0;

    while (currentId !== null) {
      if (currentId === branchId) return true;
      if (depth >= MAX_HIERARCHY_DEPTH) return true;

      const [parent] = await this.db
        .select({ parentBranch: branch.parentBranch })
        .from(branch)
        .where(eq(branch.id, currentId))
        .limit(1);

      if (!parent) break;
      currentId = parent.parentBranch;
      depth++;
    }

    return false;
  }

  private async getDepth(branchId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = branchId;

    while (currentId !== null) {
      const [parent] = await this.db
        .select({ parentBranch: branch.parentBranch })
        .from(branch)
        .where(eq(branch.id, currentId))
        .limit(1);

      if (!parent?.parentBranch) break;
      currentId = parent.parentBranch;
      depth++;

      if (depth > MAX_HIERARCHY_DEPTH) {
        throw new Error(
          `Branch hierarchy exceeds maximum depth of ${MAX_HIERARCHY_DEPTH}`,
        );
      }
    }

    return depth;
  }
}
