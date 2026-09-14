import { healthcareService } from "#/db-schemas/services";
import { ServiceFiltersSchema } from "#/schemas/services";
import { toServiceDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListServicesInputSchema = object({ input: ServiceFiltersSchema });

export const listServices = Workflow.name("healthcare.services.list")
  .input(ListServicesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ServiceFiltersSchema, input);
    const limit = parsed.limit ?? 50;
    const offset = parsed.offset ?? 0;
    const rows = await ctx.step.run("query-services", async () => {
      const conditions: SQL[] = [eq(healthcareService.branch_id, parsed.branchId)];
      if (parsed.status) {
        conditions.push(eq(healthcareService.status, parsed.status));
      }
      if (parsed.search) {
        const textMatch = or(
          ilike(healthcareService.code, `${parsed.search}%`),
          ilike(healthcareService.name, `%${parsed.search}%`),
        );
        if (textMatch) {
          conditions.push(textMatch);
        }
      }
      return ctx.db
        .select()
        .from(healthcareService)
        .where(and(...conditions))
        .orderBy(asc(healthcareService.code))
        .limit(limit)
        .offset(offset);
    });
    return {
      items: rows.map(toServiceDto),
      limit,
      offset,
    };
  });
