import type { AuditEntityType } from "#/utils/constants";
import { PIN_ITEM_TYPE, WORKSPACE_ITEM_TYPE } from "#/utils/constants";

export function auditEntityType(itemType: string): AuditEntityType {
  switch (itemType) {
    case WORKSPACE_ITEM_TYPE.DRAFT: {
      return "workspace:draft";
    }
    case WORKSPACE_ITEM_TYPE.VIEW: {
      return "workspace:view";
    }
    case PIN_ITEM_TYPE.TRIAGE: {
      return "dms:file";
    }
    case PIN_ITEM_TYPE.FILE_VIEW: {
      return "dms:file_view";
    }
    case PIN_ITEM_TYPE.CLASS: {
      return "dms:class";
    }
    default: {
      return "workspace:dashboard";
    }
  }
}
