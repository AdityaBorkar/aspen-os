import type { AuditEntityType } from "#/utils/constants";
import { AUDIT_ENTITY_TYPE, PIN_ITEM_TYPE, WORKSPACE_ITEM_TYPE } from "#/utils/constants";

export function auditEntityType(itemType: string): AuditEntityType {
  switch (itemType) {
    case WORKSPACE_ITEM_TYPE.DRAFT: {
      return AUDIT_ENTITY_TYPE.DRAFT;
    }
    case WORKSPACE_ITEM_TYPE.VIEW: {
      return AUDIT_ENTITY_TYPE.VIEW;
    }
    case PIN_ITEM_TYPE.TRIAGE: {
      return AUDIT_ENTITY_TYPE.DMS_FILE;
    }
    case PIN_ITEM_TYPE.FILE_VIEW: {
      return AUDIT_ENTITY_TYPE.DMS_FILE_VIEW;
    }
    case PIN_ITEM_TYPE.CLASS: {
      return AUDIT_ENTITY_TYPE.DMS_CLASS;
    }
    default: {
      return AUDIT_ENTITY_TYPE.DASHBOARD;
    }
  }
}
