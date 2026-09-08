import { NOTES_ACCESS } from "#/utils/constants";
import type { NotesAccess } from "#/utils/constants";

import type { AuthUnit } from "@aspen-os/platform/server";
import { getContext } from "@aspen-os/platform/server";

export interface AccessScopedRow {
  access: NotesAccess;
  owner_id: string;
}

const ADMIN_ROLE = "admin";

export function requireActorId(actorId: string | undefined): string {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  return actorId;
}

function resolveAuthUnit(auth?: AuthUnit): AuthUnit {
  return auth ?? getContext().auth;
}

export async function isTenantAdmin(actorId: string, auth?: AuthUnit): Promise<boolean> {
  const unit = resolveAuthUnit(auth);
  const found = await unit.rest.user.get({ id: actorId });
  return found?.role === ADMIN_ROLE;
}

export async function assertCanAccess(
  row: AccessScopedRow,
  actorId: string | undefined,
  auth?: AuthUnit,
): Promise<void> {
  const actor = requireActorId(actorId);
  if (row.access === NOTES_ACCESS.GLOBAL || row.owner_id === actor) {
    return;
  }
  if (await isTenantAdmin(actor, auth)) {
    return;
  }
  throw new Error("You do not have access to this note");
}

export async function assertCanMutate(
  row: AccessScopedRow,
  actorId: string | undefined,
  auth?: AuthUnit,
): Promise<void> {
  const actor = requireActorId(actorId);
  if (row.owner_id === actor) {
    return;
  }
  if (await isTenantAdmin(actor, auth)) {
    return;
  }
  throw new Error("Only the owner or a tenant admin can modify this note");
}

export async function resolveOwnerId(
  actorId: string | undefined,
  explicit?: string,
  auth?: AuthUnit,
): Promise<string> {
  const actor = requireActorId(actorId);
  if (!explicit || explicit === actor) {
    return actor;
  }
  if (await isTenantAdmin(actor, auth)) {
    return explicit;
  }
  throw new Error("Only a tenant admin can assign a note to another owner");
}
