import { healthcareAllergy } from "#/db-schemas/patient";
import { CheckInteractionSchema } from "#/schemas/allopathy";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CheckInteractionInputSchema = object({ input: CheckInteractionSchema });

export interface InteractionWarning {
  drug: string;
  kind: "allergy" | "interaction";
  message: string;
}

const KNOWN_PAIRS: Array<[string, string, string]> = [
  ["warfarin", "aspirin", "Bleeding risk: warfarin + aspirin"],
  ["warfarin", "nsaid", "Bleeding risk: warfarin + NSAID"],
  ["methotrexate", "nsaid", "Methotrexate toxicity risk with NSAID"],
  ["lithium", "nsaid", "Lithium toxicity risk with NSAID"],
  ["ace inhibitor", "potassium", "Hyperkalemia risk: ACE inhibitor + potassium"],
];

export const checkInteraction = Workflow.name("healthcare.allopathy.checkInteraction")
  .input(CheckInteractionInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CheckInteractionSchema, input);
    const normalized = parsed.drugs.map((d) => d.trim().toLowerCase());

    const allergyRows = await ctx.step.run("fetch-allergies", async () =>
      ctx.db
        .select()
        .from(healthcareAllergy)
        .where(eq(healthcareAllergy.patient_id, parsed.patientId)),
    );
    const allergyNames = new Set([
      ...allergyRows.map((r) => r.name.trim().toLowerCase()),
      ...parsed.allergies.map((a) => a.trim().toLowerCase()),
    ]);

    const warnings: InteractionWarning[] = [];
    for (const drug of parsed.drugs) {
      const key = drug.trim().toLowerCase();
      for (const name of allergyNames) {
        if (name && (key.includes(name) || name.includes(key))) {
          warnings.push({
            drug,
            kind: "allergy",
            message: `Allergy match: "${drug}" conflicts with recorded allergy "${name}"`,
          });
        }
      }
    }
    for (const [a, b, message] of KNOWN_PAIRS) {
      const hasA = normalized.some((d) => d.includes(a));
      const hasB = normalized.some((d) => d.includes(b));
      if (hasA && hasB) {
        warnings.push({ drug: `${a} + ${b}`, kind: "interaction", message });
      }
    }

    const acked = new Set(parsed.acknowledged);
    const unacknowledged = warnings.filter(
      (w) => !acked.has(`${w.drug}:${w.message}`) && !acked.has(w.message),
    );
    return {
      acknowledged: parsed.acknowledged,
      blocked: unacknowledged.length > 0,
      patientId: parsed.patientId,
      unacknowledged,
      warnings,
    };
  });
