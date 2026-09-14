import { healthcareFacility } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { CreateFacilitySchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toFacilityDto } from "#/workflow-steps/fetch-facility";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateFacilityInputSchema = object({ input: CreateFacilitySchema });

export const createFacility = Workflow.name("healthcare.facilities.create")
  .input(CreateFacilityInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFacilitySchema, input);
    const { branchId } = parsed;
    let code = parsed.code ?? null;
    if (code) {
      const wantedCode: string = code;
      const duplicate = await ctx.step.run("check-code-duplicate", async () => {
        const [existing] = await ctx.db
          .select({ id: healthcareFacility.id })
          .from(healthcareFacility)
          .where(
            and(
              eq(healthcareFacility.branch_id, branchId),
              eq(healthcareFacility.code, wantedCode),
            ),
          )
          .limit(1);
        return existing;
      });
      if (duplicate) {
        throw new Error(
          `Facility code "${code}" already exists in this branch; codes must be unique.`,
        );
      }
    } else {
      const seq = await ctx.step.run(nextHealthcareSeries, {
        input: { series: "facility" },
      });
      code = `FAC-${seq}`;
    }
    const [row] = await ctx.step.run("insert-facility", async () =>
      ctx.db
        .insert(healthcareFacility)
        .values({
          branch_id: branchId,
          category: parsed.category,
          code,
          id: crypto.randomUUID(),
          name: parsed.name,
          payload: { schedules: [] },
          status: "free",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create facility.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.FACILITY,
        newState: {
          branchId: row.branch_id,
          category: row.category,
          code: row.code,
          id: row.id,
          name: row.name,
        },
      });
      await ctx.pubsub.publish(FACILITY_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toFacilityDto(row);
  });
