import { healthcareRehabEpisode } from "#/db-schemas/rehab";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const FetchRehabEpisodeInputSchema = object({ id: string() });

export const fetchRehabEpisodeStep = WorkflowStep.name("healthcare-fetch-rehab-episode")
  .input(FetchRehabEpisodeInputSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(healthcareRehabEpisode)
      .where(eq(healthcareRehabEpisode.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error("Rehab episode not found; open an episode first");
    }
    return row;
  });
