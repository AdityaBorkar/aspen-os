// Canonical branch plumbing for the healthcare bounded context.
//
// healthcare_branch is a subdomain-routing row (unique subdomain, address in
// payload): it scopes every clinical table via branch_id, default "main".
// It is not the organization hierarchy: Organization Branch / masters
// orgBranch (code-unique tree with headquarters/office/warehouse types and
// masters.org_branch_* events) lives in @aspen-os/masters. See
// .working-docs/bounded-contexts/healthcare.md language section.
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
  org_branch_code: string | null;
  payload: Record<string, string>;
  status: string;
  subdomain: string;
}

export interface BranchInsertOptions {
  address?: string;
  name: string;
  orgBranchCode?: string | null;
  subdomain: string;
}

export function branchInsertValues(options: BranchInsertOptions): BranchInsert {
  return {
    branch_id: "main",
    name: options.name,
    org_branch_code: options.orgBranchCode ?? null,
    payload: options.address ? { address: options.address } : {},
    status: "active",
    subdomain: options.subdomain,
  };
}

export function branchEventScope(row: typeof healthcareBranch.$inferSelect): string {
  return row.branch_id;
}
