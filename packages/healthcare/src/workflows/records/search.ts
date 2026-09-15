import { healthcareClinicalDocument, healthcareMedicalRegister } from "#/db-schemas/records";
import { SearchRecordsSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SearchInputSchema = object({ input: SearchRecordsSchema });

export const search = Workflow.name("healthcare.records.search")
  .input(SearchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SearchRecordsSchema, input);
    const branchId = parsed.branchId ?? "main";
    const query = parsed.q.toLowerCase();
    const [docs, registers] = await ctx.step.run("load-search", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareClinicalDocument)
          .where(eq(healthcareClinicalDocument.branch_id, branchId))
          .limit(500),
        ctx.db
          .select()
          .from(healthcareMedicalRegister)
          .where(eq(healthcareMedicalRegister.branch_id, branchId))
          .limit(500),
      ]),
    );
    const hits = [
      ...docs.map((row) => ({
        id: row.id,
        kind: "document",
        text: `${row.label ?? ""} ${row.file_type} ${row.patient_id}`,
      })),
      ...registers.map((row) => ({
        id: row.id,
        kind: "register",
        text: `${row.register} ${row.details}`,
      })),
    ].filter((hit) => hit.text.toLowerCase().includes(query));
    return hits.slice(0, 50);
  });
