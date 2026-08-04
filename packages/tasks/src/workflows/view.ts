import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { savedView } from "../db-schema";
import type { CreateSavedViewInput, UpdateSavedViewInput } from "../types";
import { CreateSavedViewSchema, UpdateSavedViewSchema } from "../types";

type ViewType = "list" | "board" | "calendar" | "timeline";

export interface ViewServiceDeps {
  db: NodePgDatabase;
}

export async function createSavedView(
  input: CreateSavedViewInput,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateSavedViewSchema, input);

  if (parsed.isDefault) {
    await unsetDefault(parsed.ownerId, parsed.projectId ?? null, deps);
  }

  const [result] = await db
    .insert(savedView)
    .values({
      filters: parsed.filters ?? null,
      groupBy: parsed.groupBy ?? null,
      isDefault: parsed.isDefault ?? false,
      isShared: parsed.isShared ?? false,
      name: parsed.name,
      ownerId: parsed.ownerId,
      projectId: parsed.projectId ?? null,
      sort: parsed.sort ?? null,
      type: (parsed.type ?? "list") as ViewType,
    })
    .returning();

  return result;
}

export async function updateSavedView(
  id: string,
  patch: UpdateSavedViewInput,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  await getSavedViewById(id, deps);
  const parsed = parse(UpdateSavedViewSchema, patch);

  const [updated] = await db
    .update(savedView)
    .set({
      filters: parsed.filters,
      groupBy: parsed.groupBy,
      isDefault: parsed.isDefault,
      isShared: parsed.isShared,
      name: parsed.name,
      sort: parsed.sort,
      type: parsed.type as ViewType | undefined,
    })
    .where(eq(savedView.id, id))
    .returning();

  return updated;
}

export async function deleteSavedView(id: string, deps: ViewServiceDeps) {
  const { db } = deps;
  await db.delete(savedView).where(eq(savedView.id, id));
}

export async function getSavedViewById(id: string, deps: ViewServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(savedView)
    .where(eq(savedView.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Saved view with id "${id}" not found.`);
  }

  return result;
}

export async function listSavedViewsByOwner(
  ownerId: string,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  return db.select().from(savedView).where(eq(savedView.ownerId, ownerId));
}

export async function listSavedViewsByProject(
  projectId: string,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  return db.select().from(savedView).where(eq(savedView.projectId, projectId));
}

export async function listSharedSavedViews(
  projectId: string,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(savedView)
    .where(
      and(eq(savedView.projectId, projectId), eq(savedView.isShared, true)),
    );
}

export async function getDefaultSavedView(
  ownerId: string,
  projectId: string | undefined,
  deps: ViewServiceDeps,
) {
  const { db } = deps;
  const conditions = [
    eq(savedView.ownerId, ownerId),
    eq(savedView.isDefault, true),
  ];

  if (projectId) {
    conditions.push(eq(savedView.projectId, projectId));
  }

  const [result] = await db
    .select()
    .from(savedView)
    .where(and(...conditions))
    .limit(1);

  return result ?? null;
}

async function unsetDefault(
  ownerId: string,
  projectId: string | null,
  deps: ViewServiceDeps,
): Promise<void> {
  const { db } = deps;
  const conditions = [
    eq(savedView.ownerId, ownerId),
    eq(savedView.isDefault, true),
  ];

  if (projectId) {
    conditions.push(eq(savedView.projectId, projectId));
  }

  await db
    .update(savedView)
    .set({ isDefault: false })
    .where(and(...conditions));
}
