import type {
  healthcareMasterVersion,
  healthcareRecallRule,
  healthcareTemplate,
} from "#/db-schemas/admin";
import { healthcareCompany } from "#/db-schemas/admin";
import { healthcareBranch } from "#/db-schemas/branch";
import { WithIdSchema } from "#/schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, string } from "valibot";

export const fetchCompanyStep = WorkflowStep.name("healthcare-fetch-company")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareCompany)
      .where(eq(healthcareCompany.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Company "${input.id}" not found.`);
    }
    return row;
  });

export interface CompanyDto {
  createdAt: string;
  id: string;
  logo: string | null;
  name: string;
  slug: string | null;
  updatedAt: string;
}

export function toCompanyDto(row: typeof healthcareCompany.$inferSelect): CompanyDto {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    logo: row.logo,
    name: row.name,
    slug: row.slug,
    updatedAt: row.updated_at.toISOString(),
  };
}

export const fetchBranchStep = WorkflowStep.name("healthcare-fetch-branch")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareBranch)
      .where(eq(healthcareBranch.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Branch "${input.id}" not found.`);
    }
    return row;
  });

export interface BranchDto {
  address: string | null;
  createdAt: string;
  id: string;
  name: string;
  orgBranchCode: string | null;
  status: string;
  subdomain: string;
}

export function toBranchDto(row: typeof healthcareBranch.$inferSelect): BranchDto {
  const { address } = row.payload;
  return {
    address: is(string(), address) ? address : null,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    name: row.name,
    orgBranchCode: row.org_branch_code,
    status: row.status,
    subdomain: row.subdomain,
  };
}

export interface MasterVersionDto {
  branchId: string;
  createdAt: string;
  domain: string;
  id: string;
  payload: string | null;
  version: string;
}

export function toMasterVersionDto(
  row: typeof healthcareMasterVersion.$inferSelect,
): MasterVersionDto {
  const { raw } = row.payload;
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    domain: row.domain,
    id: row.id,
    payload: is(string(), raw) ? raw : null,
    version: row.version,
  };
}

export interface TemplateDto {
  body: string;
  branchId: string;
  createdAt: string;
  id: string;
  kind: string;
  name: string;
  status: string;
}

export function toTemplateDto(row: typeof healthcareTemplate.$inferSelect): TemplateDto {
  return {
    body: row.body,
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    kind: row.kind,
    name: row.name,
    status: row.status,
  };
}

export interface RecallRuleDto {
  branchId: string;
  createdAt: string;
  daysAfter: number;
  id: string;
  message: string;
  name: string;
  status: string;
}

export function toRecallRuleDto(row: typeof healthcareRecallRule.$inferSelect): RecallRuleDto {
  return {
    branchId: row.branch_id,
    createdAt: row.created_at.toISOString(),
    daysAfter: row.days_after,
    id: row.id,
    message: row.message,
    name: row.name,
    status: row.status,
  };
}
