import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";
import type { RenewalChainEntry } from "../types";

const getRenewalChain = Workflow.name("document.renewal-chain").handler(
  async (input: { id: string }, ctx): Promise<RenewalChainEntry[]> => {
    const chain: RenewalChainEntry[] = [];
    let currentId: string | null = input.id;

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

    return chain;
  },
);

export { getRenewalChain };
