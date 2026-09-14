import { healthcareInvoice, healthcareReceipt } from "#/db-schemas/billing";
import { healthcareNursingVitals, healthcarePainScore } from "#/db-schemas/nursing";
import {
  healthcareBreakglassGrant,
  healthcareClinicalDocument,
  healthcareDischargeSummary,
  healthcareShareLog,
} from "#/db-schemas/records";
import {
  healthcareDailyLog,
  healthcareGeriatricScore,
  healthcareRound,
  healthcareVisitLog,
} from "#/db-schemas/residents";
import { TimelineQuerySchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

const TimelineInputSchema = object({
  input: object({ ...TimelineQuerySchema.entries, encounterId: optional(string()) }),
});

export interface TimelineItem {
  at: string;
  id: string;
  kind: string;
  summary: string;
}

export const timeline = Workflow.name("healthcare.records.timeline")
  .input(TimelineInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TimelineInputSchema, { input }).input;
    const branchId = parsed.branchId ?? "main";
    const started = Date.now();
    const [
      docs,
      shares,
      discharges,
      grants,
      vitals,
      pains,
      invoices,
      receipts,
      logs,
      rounds,
      visits,
      scores,
    ] = await ctx.step.run("load-timeline", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareClinicalDocument)
          .where(
            and(
              eq(healthcareClinicalDocument.branch_id, branchId),
              eq(healthcareClinicalDocument.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcareClinicalDocument.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareShareLog)
          .where(
            and(
              eq(healthcareShareLog.branch_id, branchId),
              eq(healthcareShareLog.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcareShareLog.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareDischargeSummary)
          .where(eq(healthcareDischargeSummary.branch_id, branchId))
          .orderBy(desc(healthcareDischargeSummary.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareBreakglassGrant)
          .where(
            and(
              eq(healthcareBreakglassGrant.branch_id, branchId),
              eq(healthcareBreakglassGrant.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcareBreakglassGrant.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareNursingVitals)
          .where(
            and(
              eq(healthcareNursingVitals.branch_id, branchId),
              eq(healthcareNursingVitals.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcareNursingVitals.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcarePainScore)
          .where(
            and(
              eq(healthcarePainScore.branch_id, branchId),
              eq(healthcarePainScore.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcarePainScore.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareInvoice)
          .where(
            and(
              eq(healthcareInvoice.branch_id, branchId),
              eq(healthcareInvoice.patient_id, parsed.patientId),
            ),
          )
          .orderBy(desc(healthcareInvoice.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareReceipt)
          .where(eq(healthcareReceipt.branch_id, branchId))
          .orderBy(desc(healthcareReceipt.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareDailyLog)
          .where(eq(healthcareDailyLog.branch_id, branchId))
          .orderBy(desc(healthcareDailyLog.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareRound)
          .where(eq(healthcareRound.branch_id, branchId))
          .orderBy(desc(healthcareRound.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareVisitLog)
          .where(eq(healthcareVisitLog.branch_id, branchId))
          .orderBy(desc(healthcareVisitLog.created_at))
          .limit(200),
        ctx.db
          .select()
          .from(healthcareGeriatricScore)
          .where(eq(healthcareGeriatricScore.branch_id, branchId))
          .orderBy(desc(healthcareGeriatricScore.created_at))
          .limit(200),
      ]),
    );
    const invoiceIds = new Set(invoices.map((row) => row.id));
    const items: TimelineItem[] = [
      ...docs.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "document",
        summary: row.label ?? row.file_type,
      })),
      ...shares.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "share",
        summary: `${row.channel}:${row.recipient}`,
      })),
      ...discharges
        .filter((row) => !parsed.encounterId || row.encounter_id === parsed.encounterId)
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "discharge",
          summary: row.encounter_id,
        })),
      ...grants.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "breakglass",
        summary: row.reason,
      })),
      ...vitals.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "vitals",
        summary: `ews:${row.ews}`,
      })),
      ...pains.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "pain",
        summary: `${row.phase}:${row.score}`,
      })),
      ...invoices.map((row) => ({
        at: row.created_at.toISOString(),
        id: row.id,
        kind: "invoice",
        summary: `${row.invoice_no}:${row.status}`,
      })),
      ...receipts
        .filter((row) => invoiceIds.has(row.invoice_id))
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "receipt",
          summary: `${row.mode}:${row.amount}`,
        })),
      ...logs
        .filter((row) => row.resident_id === parsed.patientId)
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "daily-log",
          summary: row.note.slice(0, 80),
        })),
      ...rounds
        .filter((row) => row.resident_id === parsed.patientId)
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "round",
          summary: row.findings.slice(0, 80),
        })),
      ...visits
        .filter((row) => row.resident_id === parsed.patientId)
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "visit",
          summary: row.visitor,
        })),
      ...scores
        .filter((row) => row.resident_id === parsed.patientId)
        .map((row) => ({
          at: row.created_at.toISOString(),
          id: row.id,
          kind: "score",
          summary: `${row.kind}:${row.score}`,
        })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return { items: items.slice(0, 100), ms: Date.now() - started, patientId: parsed.patientId };
  });
