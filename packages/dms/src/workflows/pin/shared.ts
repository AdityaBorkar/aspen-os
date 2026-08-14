import { object } from "valibot";

import { IdSchema, PinItemTypeSchema } from "../../types";
import type { AuditEntityType } from "../../utils/constants";

export const PinItemInputSchema = object({
  itemId: IdSchema,
  itemType: PinItemTypeSchema,
  userId: IdSchema,
});

export function auditEntityType(itemType: string): AuditEntityType {
  switch (itemType) {
    case "triage":
      return "dms:file";
    case "class":
      return "dms:class";
    default:
      return "dms:file_view";
  }
}
