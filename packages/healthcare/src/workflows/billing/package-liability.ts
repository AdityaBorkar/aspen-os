import { healthcarePackageBalance } from "#/db-schemas/billing";
import { PackageLiabilitySchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PackageLiabilityInputSchema = object({ input: PackageLiabilitySchema });

export const packageLiability = Workflow.name("healthcare.billing.package-liability")
  .input(PackageLiabilityInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PackageLiabilitySchema, input);
    const branchId = parsed.branchId ?? "main";

    const rows = await ctx.step.run("load-balances", async () =>
      ctx.db
        .select()
        .from(healthcarePackageBalance)
        .where(eq(healthcarePackageBalance.branch_id, branchId))
        .limit(2000),
    );
    const now = Date.now();
    const balances = [];
    let activeSessions = 0;
    let expiredSessions = 0;
    for (const row of rows) {
      const sessions = Object.values(row.balance).reduce((sum, qty) => sum + qty, 0);
      const expired =
        row.status === "expired" || (row.expires_at !== null && row.expires_at.getTime() < now);
      if (expired) {
        expiredSessions += sessions;
      } else if (row.status === "active") {
        activeSessions += sessions;
      }
      if (!parsed.includeExpired && expired) {
        continue;
      }
      balances.push({
        balance: row.balance,
        expired,
        expiresAt: row.expires_at?.toISOString() ?? null,
        id: row.id,
        packageId: row.package_id,
        patientId: row.patient_id,
        sessionsOwed: sessions,
        status: expired ? "expired" : row.status,
      });
    }
    return {
      activeSessions,
      balances,
      expiredSessions,
      packages: balances.length,
    };
  });
