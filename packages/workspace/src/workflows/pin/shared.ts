import type { AuditEntityType } from "#/utils/constants";
import { WORKSPACE_ITEM_TYPE } from "#/utils/constants";

export function auditEntityType(itemType: string): AuditEntityType {
  switch (itemType) {
    case WORKSPACE_ITEM_TYPE.DRAFT: {
      return "workspace:draft";
    }
    case WORKSPACE_ITEM_TYPE.VIEW: {
      return "workspace:view";
    }
    default: {
      return "workspace:dashboard";
    }
  }
}
