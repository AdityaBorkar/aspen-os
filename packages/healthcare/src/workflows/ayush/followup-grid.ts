import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { FollowUpGridListSchema, FollowUpGridSaveSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, optional, parse, string } from "valibot";

const SaveGridInputSchema = object({ input: FollowUpGridSaveSchema });

export const saveFollowUpGrid = Workflow.name("healthcare.ayush.saveFollowUpGrid")
  .input(SaveGridInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FollowUpGridSaveSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const kase = await ctx.step.run("fetch-case-sheet", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareAyushCaseSheet)
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .limit(1);
      if (!row) {
        throw new Error("Case sheet not found; save the case sheet first");
      }
      return row;
    });
    if (kase.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the case sheet; check the selected patient");
    }

    const nowIso = new Date().toISOString();
    const entry = {
      at: nowIso,
      improvement: parsed.improvement,
      notes: parsed.notes,
      visitNo: parsed.visitNo,
    } satisfies Record<string, JsonValue>;
    const prior = kase.payload.followupGrid;
    const grid = [...(Array.isArray(prior) ? prior : []), entry];

    const [row] = await ctx.step.run("append-grid-row", async () =>
      ctx.db
        .update(healthcareAyushCaseSheet)
        .set({ payload: { ...kase.payload, followupGrid: grid } })
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the follow-up grid row.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          caseId: row.id,
          improvement: parsed.improvement,
          patientId: row.patient_id,
          visitNo: parsed.visitNo,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      caseId: row.id,
      improvement: parsed.improvement,
      notes: parsed.notes,
      patientId: row.patient_id,
      visitNo: parsed.visitNo,
    };
  });

const ListGridInputSchema = object({ input: FollowUpGridListSchema });

interface FollowUpGridEntry {
  [key: string]: string | number | undefined;
  at?: string;
  improvement?: string;
  notes?: string;
  visitNo?: number;
}

const FollowUpGridEntrySchema = object({
  at: optional(string()),
  improvement: optional(string()),
  notes: optional(string()),
  visitNo: optional(number()),
});

function isFollowUpGridEntry(value: JsonValue): value is FollowUpGridEntry {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(FollowUpGridEntrySchema, value);
}

export const listFollowUpGrid = Workflow.name("healthcare.ayush.listFollowUpGrid")
  .input(ListGridInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FollowUpGridListSchema, input);
    const row = await ctx.step.run("fetch-case-sheet", async () => {
      const [kase] = await ctx.db
        .select()
        .from(healthcareAyushCaseSheet)
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .limit(1);
      if (!kase) {
        throw new Error("Case sheet not found; save the case sheet first");
      }
      return kase;
    });
    const grid = row.payload.followupGrid;
    const gridRows: JsonValue[] = Array.isArray(grid) ? grid : [];
    return gridRows.map((entry, index) => {
      const gridEntry: FollowUpGridEntry = isFollowUpGridEntry(entry) ? entry : {};
      return {
        at: is(string(), gridEntry.at) ? gridEntry.at : null,
        improvement: is(string(), gridEntry.improvement) ? gridEntry.improvement : "same",
        index,
        notes: is(string(), gridEntry.notes) ? gridEntry.notes : "",
        visitNo: is(number(), gridEntry.visitNo) ? gridEntry.visitNo : index + 1,
      };
    });
  });
