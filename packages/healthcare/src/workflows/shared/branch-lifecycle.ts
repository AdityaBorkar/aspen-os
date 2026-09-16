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

// D6: every non-main branch must point at a masters org_branch. The DB
// column stays nullable (additive-first: backfill before NOT NULL), so the
// gate lives here at workflow validation level. Format mirrors masters
// OrgBranchCodeSchema (2-20 chars, alphanumeric with hyphens); existence
// against masters.org_branch is verified by a future lookup and is not
// checked here. The main seed shard is exempt.
const ORG_BRANCH_CODE_FORMAT = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;

export function isMainBranch(subdomain: string): boolean {
  return subdomain === "main";
}

export function assertOrgBranchCode(subdomain: string, code: string | null | undefined): string {
  if (isMainBranch(subdomain)) {
    return code ?? "";
  }
  const trimmed = code?.trim() ?? "";
  if (!trimmed) {
    throw new Error(
      `Branch "${subdomain}" needs an org_branch_code pointing at a masters org_branch`,
    );
  }
  if (trimmed.length < 2 || trimmed.length > 20 || !ORG_BRANCH_CODE_FORMAT.test(trimmed)) {
    throw new Error(
      `Branch "${subdomain}" has an invalid org_branch_code; use 2-20 alphanumeric characters with hyphens`,
    );
  }
  return trimmed;
}

export function branchEventScope(row: typeof healthcareBranch.$inferSelect): string {
  return row.branch_id;
}
