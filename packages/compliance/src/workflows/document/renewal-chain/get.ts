import { complianceDocument } from "#/db-schemas";
import type { ComplianceDocument } from "#/db-schemas";
import type { RenewalChainEntry } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const MAX_CHAIN_DEPTH = 50;

interface RenewalChainRow {
  createdAt: Date;
  id: string;
  name: string;
  renewedFrom: string | null;
  verificationStatus: ComplianceDocument["verification_status"];
}

const getRenewalChain = Workflow.name("document.renewal-chain").handler(
  async (input: { id: string }, ctx): Promise<RenewalChainEntry[]> => {
    const chain: RenewalChainEntry[] = [];
    const visited = new Set<string>();
    let currentId: string | null = input.id;

    // oxlint-disable eslint/no-await-in-loop
    while (currentId && chain.length < MAX_CHAIN_DEPTH) {
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const [doc]: RenewalChainRow[] = await ctx.db
        .select({
          createdAt: complianceDocument.created_at,
          id: complianceDocument.id,
          name: complianceDocument.name,
          renewedFrom: complianceDocument.renewed_from,
          verificationStatus: complianceDocument.verification_status,
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
