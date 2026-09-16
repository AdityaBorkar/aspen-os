import { healthcareTherapyPackage } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateTherapyPackageSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  AYUSH_PACKAGE_DEFAULT_VALIDITY_DAYS,
  packageExpiryAt,
  remainingSessions,
} from "#/workflows/shared/package-lifecycle";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SellPackageInputSchema = object({ input: CreateTherapyPackageSchema });

export const sellPackage = Workflow.name("emr.ayush.sellPackage")
  .input(SellPackageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTherapyPackageSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const validDays = parsed.validDays ?? AYUSH_PACKAGE_DEFAULT_VALIDITY_DAYS;
    const packagePayload: Record<string, JsonValue> = {};
    if (parsed.procedures) {
      packagePayload.procedures = parsed.procedures;
    }
    if (parsed.outcomeNote) {
      packagePayload.outcomeNote = parsed.outcomeNote;
    }
    const [row] = await ctx.step.run("insert-therapy-package", async () =>
      ctx.db
        .insert(healthcareTherapyPackage)
        .values({
          branch_id: branchId,
          case_id: parsed.caseId ?? null,
          created_by: actorId,
          name: parsed.name,
          patient_id: parsed.patientId,
          payload: packagePayload,
          status: parsed.status,
          total_sittings: parsed.totalSittings,
          used_sittings: 0,
          valid_till: packageExpiryAt(validDays),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to sell the therapy package.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          id: row.id,
          name: row.name,
          patientId: row.patient_id,
          status: row.status,
          totalSittings: row.total_sittings,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    const sellSpec: Record<string, JsonValue> = row.payload;
    const attended = row.used_sittings ?? 0;
    const remaining = remainingSessions(row.total_sittings, attended);
    return {
      attended,
      branchId: row.branch_id,
      caseId: row.case_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      name: row.name,
      patientId: row.patient_id,
      procedures: Array.isArray(sellSpec.procedures) ? sellSpec.procedures : [],
      remaining,
      status: row.status,
      totalSittings: row.total_sittings,
      usedSittings: attended,
      validTill: row.valid_till ? row.valid_till.toISOString() : null,
    };
  });
