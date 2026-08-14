export { dmsAccessLog } from "./access-log";
export { dmsClass } from "./class";
export { dmsClassField, dmsFieldTypeEnum } from "./class-field";
export { dmsContact } from "./contact";
export { dmsEntityLabel } from "./entity-label";
export {
  dmsEntityTypeEnum,
  dmsFileStatusEnum,
  dmsGranteeTypeEnum,
  dmsPublicLinkPermissionEnum,
  dmsSharePermissionEnum,
} from "./enums";
export { dmsFile } from "./file";
export { dmsFileVersion } from "./file-version";
export { dmsFileView } from "./file-view";
export { dmsFolder } from "./folder";
export { dmsLabel } from "./label";
export { dmsLegalHold } from "./legal-hold";
export { dmsPin, dmsPinItemTypeEnum } from "./pin";
export { dmsPublicLink } from "./public-link";
export { dmsSetting } from "./setting";
export { dmsShare } from "./share";

import { dmsAccessLog } from "./access-log";
import { dmsClass } from "./class";
import { dmsClassField } from "./class-field";
import { dmsContact } from "./contact";
import { dmsEntityLabel } from "./entity-label";
import { dmsFile } from "./file";
import { dmsFileVersion } from "./file-version";
import { dmsFileView } from "./file-view";
import { dmsFolder } from "./folder";
import { dmsLabel } from "./label";
import { dmsLegalHold } from "./legal-hold";
import { dmsPin } from "./pin";
import { dmsPublicLink } from "./public-link";
import { dmsSetting } from "./setting";
import { dmsShare } from "./share";

export const dmsTables = {
  dmsAccessLog,
  dmsClass,
  dmsClassField,
  dmsContact,
  dmsEntityLabel,
  dmsFile,
  dmsFileVersion,
  dmsFileView,
  dmsFolder,
  dmsLabel,
  dmsLegalHold,
  dmsPin,
  dmsPublicLink,
  dmsSetting,
  dmsShare,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = dmsTables;
