import { healthcareLabOrder, healthcareLabTest } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { AddOnTestSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { is, array, object, parse, string } from "valibot";

const AddOnTestInputSchema = object({ input: AddOnTestSchema });

const TestListSchema = array(string());

export const addonTest = Workflow.name("diagnostics.addon-test")
  .input(AddOnTestInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddOnTestSchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (["authorized", "delivered", "cancelled", "billed"].includes(detail)) {
      throw new Error(`Add-on blocked: order is ${detail}; raise a fresh order instead.`);
    }
    if (parsed.tests.length === 0) {
      throw new Error("Add-on needs at least one test.");
    }
    const known = await ctx.step.run("verify-tests", async () =>
      ctx.db
        .select({ code: healthcareLabTest.code, id: healthcareLabTest.id })
        .from(healthcareLabTest)
        .where(
          and(
            eq(healthcareLabTest.branch_id, branchId),
            inArray(healthcareLabTest.id, parsed.tests),
          ),
        ),
    );
    const knownIds = new Set(known.map((row) => row.id));
    const missing = parsed.tests.filter((id) => !knownIds.has(id));
    if (missing.length > 0) {
      throw new Error(`Unknown test ids: ${missing.join(", ")}; create the test masters first.`);
    }
    const rawTests = order.payload.tests;
    const current: string[] = is(TestListSchema, rawTests) ? [...rawTests] : [];
    const fresh = parsed.tests.filter((id) => !current.includes(id));
    if (fresh.length === 0) {
      throw new Error("All requested tests are already on this order.");
    }
    const rawCodes = order.payload.testCodes;
    const codes: string[] = is(TestListSchema, rawCodes) ? [...rawCodes] : [];
    for (const row of known) {
      if (fresh.includes(row.id) && !codes.includes(row.code)) {
        codes.push(row.code);
      }
    }
    const rawAddons = order.payload.addOns;
    const addons: JsonValue[] = Array.isArray(rawAddons) ? [...rawAddons] : [];

    await ctx.step.run("append-tests", async () => {
      await ctx.db
        .update(healthcareLabOrder)
        .set({
          payload: {
            ...order.payload,
            addOns: [
              ...addons,
              {
                at: new Date().toISOString(),
                by: parsed.requestedBy,
                tests: fresh,
              },
            ],
            testCodes: codes,
            tests: [...current, ...fresh],
          },
        })
        .where(eq(healthcareLabOrder.id, order.id));
    });

    const dto = { added: fresh, orderId: order.id };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { added: fresh, orderId: order.id },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: order.id,
      });
    });
    return dto;
  });
