export { dmsClassField, dmsFieldTypeEnum } from "./class-field";
export { dmsContact } from "./contact";
export {
  dmsDocument,
  dmsDocumentStatusEnum,
} from "./document";
export { dmsDocumentClass } from "./document-class";
export { dmsDocumentTag } from "./document-tag";
export { dmsDocumentVersion } from "./document-version";
export { dmsLegalHold } from "./legal-hold";
export { dmsPin, dmsPinItemTypeEnum } from "./pin";
export { dmsSetting } from "./setting";
export {
  dmsGranteeTypeEnum,
  dmsShare,
  dmsSharePermissionEnum,
} from "./share";
export { dmsTag } from "./tag";
export { dmsView } from "./view";

import { dmsClassField } from "./class-field";
import { dmsContact } from "./contact";
import { dmsDocument } from "./document";
import { dmsDocumentClass } from "./document-class";
import { dmsDocumentTag } from "./document-tag";
import { dmsDocumentVersion } from "./document-version";
import { dmsLegalHold } from "./legal-hold";
import { dmsPin } from "./pin";
import { dmsSetting } from "./setting";
import { dmsShare } from "./share";
import { dmsTag } from "./tag";
import { dmsView } from "./view";

export const dmsTables = {
  dmsClassField,
  dmsContact,
  dmsDocument,
  dmsDocumentClass,
  dmsDocumentTag,
  dmsDocumentVersion,
  dmsLegalHold,
  dmsPin,
  dmsSetting,
  dmsShare,
  dmsTag,
  dmsView,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = dmsTables;
