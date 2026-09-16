import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { FollowUpGridListSchema } from "#/schemas/ayush";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, optional, parse, string } from "valibot";

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

export const listFollowUpGrid = Workflow.name("emr.ayush.list-follow-up-grid")
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
