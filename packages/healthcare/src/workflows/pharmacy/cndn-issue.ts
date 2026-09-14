import {
  healthcarePharmacySale,
  healthcarePurchaseInvoice,
  healthcarePurchaseOrder,
} from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { PharmacyCndnSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, parse, string } from "valibot";

const PharmacyCndnInputSchema = object({ input: PharmacyCndnSchema });

interface CndnNote {
  [key: string]: string | number;
  amount: number;
  approver: string;
  gstAmount: number;
  kind: string;
  no: string;
  reason: string;
}

const CndnNoteSchema = object({
  amount: number(),
  approver: string(),
  kind: string(),
  no: string(),
});

function isCndnNote(value: JsonValue): value is CndnNote {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(CndnNoteSchema, value);
}

function readCndnNotes(payload: Record<string, JsonValue>): CndnNote[] {
  const raw = payload.cndnNotes;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isCndnNote);
}

export const cndnIssue = Workflow.name("healthcare.pharmacy.cndn-issue")
  .input(PharmacyCndnInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PharmacyCndnSchema, input);
    const branchId = parsed.branchId ?? "main";

    const ref = await ctx.step.run("fetch-ref", async () => {
      if (parsed.refType === "po") {
        const [row] = await ctx.db
          .select()
          .from(healthcarePurchaseOrder)
          .where(eq(healthcarePurchaseOrder.id, parsed.refId))
          .limit(1);
        return row ? { id: row.id, payload: row.payload } : null;
      }
      if (parsed.refType === "pi") {
        const [row] = await ctx.db
          .select()
          .from(healthcarePurchaseInvoice)
          .where(eq(healthcarePurchaseInvoice.id, parsed.refId))
          .limit(1);
        return row ? { id: row.id, payload: row.payload } : null;
      }
      const [row] = await ctx.db
        .select()
        .from(healthcarePharmacySale)
        .where(eq(healthcarePharmacySale.id, parsed.refId))
        .limit(1);
      return row ? { id: row.id, payload: row.payload } : null;
    });
    if (!ref) {
      throw new Error(
        `Referenced ${parsed.refType} ${parsed.refId} not found; verify the reference and retry.`,
      );
    }

    const cndnNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "cndn" } });
    const note: CndnNote = {
      amount: parsed.amount,
      approver: parsed.approver,
      gstAmount: parsed.gstAmount ?? 0,
      kind: parsed.kind,
      no: `${parsed.kind}-${String(cndnNo).padStart(6, "0")}`,
      reason: parsed.reason,
    };
    await ctx.step.run("attach-note", async () => {
      const payload = { ...ref.payload, cndnNotes: [...readCndnNotes(ref.payload), note] };
      if (parsed.refType === "po") {
        await ctx.db
          .update(healthcarePurchaseOrder)
          .set({ payload })
          .where(eq(healthcarePurchaseOrder.id, ref.id));
      } else if (parsed.refType === "pi") {
        await ctx.db
          .update(healthcarePurchaseInvoice)
          .set({ payload })
          .where(eq(healthcarePurchaseInvoice.id, ref.id));
      } else {
        await ctx.db
          .update(healthcarePharmacySale)
          .set({ payload })
          .where(eq(healthcarePharmacySale.id, ref.id));
      }
    });

    const dto = { ...note, refId: parsed.refId, refType: parsed.refType };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: ref.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { cndnNo: note.no, kind: note.kind, refId: ref.id },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: ref.id,
      });
    });
    return dto;
  });
