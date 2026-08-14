export { dmsAccessLog } from "./access-log";
export { dmsClassField, dmsFieldTypeEnum } from "./class-field";
export { dmsContact } from "./contact";
export { dmsDocument, dmsDocumentStatusEnum } from "./document";
export { dmsDocumentClass } from "./document-class";
export { dmsDocumentTag } from "./document-tag";
export { dmsDocumentVersion } from "./document-version";
export {
  dmsItemGranteeTypeEnum,
  dmsItemPermissionEnum,
  dmsItemTypeEnum,
  dmsPublicLinkPermissionEnum,
} from "./enums";
export { dmsFile } from "./file";
export { dmsFileVersion } from "./file-version";
export { dmsFolder } from "./folder";
export { dmsItemLabel } from "./item-label";
export { dmsItemShare } from "./item-share";
export { dmsLabel } from "./label";
export { dmsLegalHold } from "./legal-hold";
export { dmsPin, dmsPinItemTypeEnum } from "./pin";
export { dmsPublicLink } from "./public-link";
export { dmsSetting } from "./setting";
export { dmsGranteeTypeEnum, dmsShare, dmsSharePermissionEnum } from "./share";
export { dmsTag } from "./tag";
export { dmsView } from "./view";

import { dmsAccessLog } from "./access-log";
import { dmsClassField } from "./class-field";
import { dmsContact } from "./contact";
import { dmsDocument } from "./document";
import { dmsDocumentClass } from "./document-class";
import { dmsDocumentTag } from "./document-tag";
import { dmsDocumentVersion } from "./document-version";
import { dmsFile } from "./file";
import { dmsFileVersion } from "./file-version";
import { dmsFolder } from "./folder";
import { dmsItemLabel } from "./item-label";
import { dmsItemShare } from "./item-share";
import { dmsLabel } from "./label";
import { dmsLegalHold } from "./legal-hold";
import { dmsPin } from "./pin";
import { dmsPublicLink } from "./public-link";
import { dmsSetting } from "./setting";
import { dmsShare } from "./share";
import { dmsTag } from "./tag";
import { dmsView } from "./view";

export const dmsTables = {
  dmsAccessLog,
  dmsClassField,
  dmsContact,
  dmsDocument,
  dmsDocumentClass,
  dmsDocumentTag,
  dmsDocumentVersion,
  dmsFile,
  dmsFileVersion,
  dmsFolder,
  dmsItemLabel,
  dmsItemShare,
  dmsLabel,
  dmsLegalHold,
  dmsPin,
  dmsPublicLink,
  dmsSetting,
  dmsShare,
  dmsTag,
  dmsView,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = dmsTables;
