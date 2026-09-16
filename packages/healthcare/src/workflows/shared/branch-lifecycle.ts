import { healthcareBranch } from "#/db-schemas/branch";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type HealthcareDB = PostgresJsDatabase;

export function slugifyBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveBranchSubdomain(name: string, slug?: string): string {
  const subdomain = slugifyBranchName(slug ?? name);
  if (!subdomain) {
    throw new Error("Branch needs a usable slug; check the name and retry");
  }
  return subdomain;
}

export async function findBranchIdBySubdomain(
  db: HealthcareDB,
  subdomain: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: healthcareBranch.id })
    .from(healthcareBranch)
    .where(eq(healthcareBranch.subdomain, subdomain))
    .limit(1);
  return row?.id ?? null;
}

export async function assertSubdomainFree(db: HealthcareDB, subdomain: string): Promise<void> {
  const taken = await findBranchIdBySubdomain(db, subdomain);
  if (taken) {
    throw new Error(`Subdomain "${subdomain}" is already taken by branch ${taken}.`);
  }
}

export interface BranchInsert {
  branch_id: string;
  name: string;
  payload: Record<string, string>;
  status: string;
  subdomain: string;
}

export function branchInsertValues(
  name: string,
  address: string | undefined,
  subdomain: string,
): BranchInsert {
  return {
    branch_id: "main",
    name,
    payload: address ? { address } : {},
    status: "active",
    subdomain,
  };
}

export function branchEventScope(row: typeof healthcareBranch.$inferSelect): string {
  return row.branch_id;
}
