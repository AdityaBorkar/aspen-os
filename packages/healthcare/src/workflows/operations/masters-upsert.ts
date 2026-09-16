import { healthcareMasterEntry } from "#/db-schemas/operations";
import { healthcareMasterIntent } from "#/integrations/masters";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { UpsertMasterSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MastersUpsertInputSchema = object({ input: UpsertMasterSchema });

export const mastersUpsert = Workflow.name("healthcare.operations.masters-upsert")
  .input(MastersUpsertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpsertMasterSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [prior] = await ctx.step.run("load-prior", async () =>
      ctx.db
        .select({ version: healthcareMasterEntry.version })
        .from(healthcareMasterEntry)
        .where(
          and(
            eq(healthcareMasterEntry.branch_id, branchId),
            eq(healthcareMasterEntry.domain, parsed.domain),
            eq(healthcareMasterEntry.key, parsed.key),
          ),
        )
        .orderBy(desc(healthcareMasterEntry.version))
        .limit(1),
    );
    const [row] = await ctx.step.run("insert-version", async () =>
      ctx.db
        .insert(healthcareMasterEntry)
        .values({
          branch_id: branchId,
          domain: parsed.domain,
          key: parsed.key,
          value: parsed.value,
          version: (prior?.version ?? 0) + 1,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to upsert master entry.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { domain: row.domain, key: row.key, version: row.version },
      });
      // One shared catalogue surface is masters: healthcare keeps the clinical
      // write with the masters intent attached, masters owns the value set. The intent
      // below maps the local domain/key/value row to a masters.setting key.
      const intent = healthcareMasterIntent({
        branchId,
        domain: row.domain,
        healthcareMasterId: row.id,
        key: row.key,
        value: row.value,
        version: row.version,
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          domain: intent.domain,
          healthcareMasterId: intent.healthcareMasterId,
          key: intent.key,
          mastersKey: intent.mastersKey,
          value: intent.value,
          version: intent.version,
        },
        id: row.id,
      });
    });
    return { domain: row.domain, id: row.id, key: row.key, value: row.value, version: row.version };
  });
