import { healthcareRehabSitting } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { BookRehabSittingSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchRehabEpisodeStep } from "#/workflow-steps/fetch-rehab-episode";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { is, number, object, optional, parse, string } from "valibot";

const BookSittingInputSchema = object({ input: BookRehabSittingSchema });

const OPEN_STATUSES = ["Booked", "CheckedIn", "InProgress"];
const FALLBACK_SLOTS = ["morning", "afternoon", "evening"];

interface PackageState {
  remaining: number | null;
  expiry: string | null;
  expiryWarning: string | null;
}

interface PackageNumbers {
  soldAt: string | null;
  total: number | null;
  used: number;
  validityDays: number | null;
}

const RehabPackageStateSchema = object({
  soldAt: optional(string()),
  totalSessions: optional(number()),
  usedSessions: optional(number()),
  validityDays: optional(number()),
});

function readPackagePayload(payload: JsonValue): PackageNumbers {
  if (!is(RehabPackageStateSchema, payload)) {
    return { soldAt: null, total: null, used: 0, validityDays: null };
  }
  return {
    soldAt: payload.soldAt ?? null,
    total: payload.totalSessions ?? null,
    used: payload.usedSessions ?? 0,
    validityDays: payload.validityDays ?? null,
  };
}

function packageState(payload: JsonValue, bookingDate: string): PackageState {
  const { soldAt, total, used, validityDays } = readPackagePayload(payload);
  const remaining = total === null ? null : total - used;
  if (remaining !== null && remaining <= 0) {
    throw new Error("Package is exhausted; renew the package before booking another sitting");
  }
  let expiry: string | null = null;
  let expiryWarning: string | null = null;
  if (soldAt && validityDays !== null) {
    const expiryMs = new Date(soldAt).getTime() + validityDays * 86_400_000;
    expiry = new Date(expiryMs).toISOString().slice(0, 10);
    if (bookingDate > expiry) {
      throw new Error(`Package expired on ${expiry}; renew the package before booking`);
    }
    const daysLeft = Math.ceil((expiryMs - new Date(bookingDate).getTime()) / 86_400_000);
    if (daysLeft <= 7) {
      expiryWarning = `Package expires on ${expiry} (${daysLeft} day(s) left)`;
    }
  }
  return { expiry, expiryWarning, remaining };
}

export const bookSitting = Workflow.name("healthcare.rehab.bookSitting")
  .input(BookSittingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookRehabSittingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const episode = await ctx.step.run(fetchRehabEpisodeStep, {
      id: parsed.episodeId,
    });
    if (episode.status !== "Active") {
      throw new Error("Rehab episode is discharged; open a new episode for further care");
    }
    if (episode.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the rehab episode; check the selected patient");
    }

    const pkg = packageState(episode.payload.rehabPackage, parsed.date);

    // Conflict detection: the same therapist cannot take two sittings in one
    // slot (even across branches), and equipment cannot double-book per branch.
    if (parsed.slot && (parsed.therapistId || parsed.equipmentId)) {
      const clash = await ctx.step.run("check-slot-conflict", async () => {
        const rows = await ctx.db
          .select()
          .from(healthcareRehabSitting)
          .where(
            and(
              eq(healthcareRehabSitting.date, parsed.date),
              eq(healthcareRehabSitting.slot, parsed.slot ?? ""),
              inArray(healthcareRehabSitting.status, OPEN_STATUSES),
            ),
          )
          .limit(50);
        return rows.find((row) => {
          const { payload } = row;
          const therapist = is(string(), payload.therapistId) ? payload.therapistId : null;
          const equipment = is(string(), payload.equipmentId) ? payload.equipmentId : null;
          if (parsed.therapistId && therapist === parsed.therapistId) {
            return true;
          }
          if (
            parsed.equipmentId &&
            row.branch_id === branchId &&
            equipment === parsed.equipmentId
          ) {
            return true;
          }
          return false;
        });
      });
      if (clash) {
        const nextFree = await ctx.step.run("suggest-next-free-slot", async () => {
          const rows = await ctx.db
            .select()
            .from(healthcareRehabSitting)
            .where(
              and(
                eq(healthcareRehabSitting.date, parsed.date),
                inArray(healthcareRehabSitting.status, OPEN_STATUSES),
              ),
            )
            .limit(100);
          const taken = new Set(
            rows
              .filter((row) => {
                const { payload } = row;
                const therapist = is(string(), payload.therapistId) ? payload.therapistId : null;
                const equipment = is(string(), payload.equipmentId) ? payload.equipmentId : null;
                return (
                  (parsed.therapistId && therapist === parsed.therapistId) ||
                  (parsed.equipmentId &&
                    row.branch_id === branchId &&
                    equipment === parsed.equipmentId)
                );
              })
              .map((row) => row.slot ?? ""),
          );
          const candidates = parsed.slot
            ? [parsed.slot, ...FALLBACK_SLOTS.filter((slot) => slot !== parsed.slot)]
            : FALLBACK_SLOTS;
          const free = candidates.find((slot) => !taken.has(slot));
          return free
            ? `${parsed.date} ${free}`
            : `${parsed.date} (fully booked; try the next day)`;
        });
        throw new Error(
          `Slot is already booked for this therapist/equipment; next free slot: ${nextFree}`,
        );
      }
    }

    const sittingPayload = {
      equipmentId: parsed.equipmentId ?? null,
      therapistId: parsed.therapistId ?? null,
    } satisfies Record<string, JsonValue>;

    const [row] = await ctx.step.run("insert-rehab-sitting", async () =>
      ctx.db
        .insert(healthcareRehabSitting)
        .values({
          branch_id: branchId,
          created_by: actorId,
          date: parsed.date,
          episode_id: parsed.episodeId,
          package_id: parsed.packageId ?? null,
          patient_id: parsed.patientId,
          payload: sittingPayload,
          slot: parsed.slot ?? null,
          status: "Booked",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to book the rehab sitting.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          date: row.date,
          episodeId: row.episode_id,
          id: row.id,
          patientId: row.patient_id,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      episodeId: row.episode_id,
      expiry: pkg.expiry,
      expiryWarning: pkg.expiryWarning,
      id: row.id,
      packageId: row.package_id,
      patientId: row.patient_id,
      remaining: pkg.remaining,
      slot: row.slot,
      status: row.status,
    };
  });
