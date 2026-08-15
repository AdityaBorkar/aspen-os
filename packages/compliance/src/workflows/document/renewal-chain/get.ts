import { complianceDocument } from "#/db-schemas";
import type { RenewalChainEntry } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const getRenewalChain = Workflow.name("document.renewal-chain").handler(
  async (input: { id: string }, ctx): Promise<RenewalChainEntry[]> => {
    const chain: RenewalChainEntry[] = [];
    let currentId: string | null = input.id;

    // oxlint-disable eslint/no-await-in-loop
    while (currentId) {
      const [doc] = await ctx.db
        .select({
          createdAt: complianceDocument.createdAt,
          id: complianceDocument.id,
          name: complianceDocument.name,
          renewedFrom: complianceDocument.renewedFrom,
          verificationStatus: complianceDocument.verificationStatus,
        })
        .from(complianceDocument)
        .where(eq(complianceDocument.id, currentId))
        .limit(1);

      if (!doc) {
        break;
      }

      chain.push({
        createdAt: doc.createdAt.toISOString(),
        id: doc.id,
        name: doc.name,
        renewedFrom: doc.renewedFrom,
        verificationStatus: doc.verificationStatus,
      });

      currentId = doc.renewedFrom;
    }
    // oxlint-enable eslint/no-await-in-loop

    return chain;
  },
);

export { getRenewalChain };
