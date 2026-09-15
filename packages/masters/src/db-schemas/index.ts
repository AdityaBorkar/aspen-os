import { masterAddress } from "#/db-schemas/address";
import { masterConnection } from "#/db-schemas/connection";
import { masterContact } from "#/db-schemas/contact";
import { masterEntity } from "#/db-schemas/entity";
import { masterEntityLabel } from "#/db-schemas/entity-label";
import {
  masterCardBrandEnum,
  masterConnectionStatusEnum,
  masterContactTypeEnum,
  masterEntityKindEnum,
  masterEntityStatusEnum,
  masterEntityTypeEnum,
  masterIntegrationTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterUomCategoryEnum,
} from "#/db-schemas/enums";
import { masterLabel } from "#/db-schemas/label";
import { orgBranch, orgBranchTypeEnum } from "#/db-schemas/org-branch";
import { masterPaymentMethod } from "#/db-schemas/payment-method";
import { masterSetting } from "#/db-schemas/setting";
import {
  masterUnitOfMeasure,
  masterUomAlias,
  masterUomVersion,
} from "#/db-schemas/unit-of-measure";

export { masterAddress } from "#/db-schemas/address";
export { masterConnection } from "#/db-schemas/connection";
export { masterContact } from "#/db-schemas/contact";
export { masterEntity } from "#/db-schemas/entity";
export { masterEntityLabel } from "#/db-schemas/entity-label";
export { orgBranch, orgBranchTypeEnum } from "#/db-schemas/org-branch";
export {
  masterCardBrandEnum,
  masterConnectionStatusEnum,
  masterContactTypeEnum,
  masterEntityKindEnum,
  masterEntityStatusEnum,
  masterEntityTypeEnum,
  masterIntegrationTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterUomCategoryEnum,
} from "#/db-schemas/enums";
export { masterLabel } from "#/db-schemas/label";
export { masterPaymentMethod } from "#/db-schemas/payment-method";
export { masterSetting } from "#/db-schemas/setting";
export { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";
export { masterUomAlias } from "#/db-schemas/unit-of-measure";
export { masterUomVersion } from "#/db-schemas/unit-of-measure";

export const mastersTables = {
  masterAddress,
  masterCardBrandEnum,
  masterConnection,
  masterConnectionStatusEnum,
  masterContact,
  masterContactTypeEnum,
  masterEntity,
  masterEntityKindEnum,
  masterEntityLabel,
  masterEntityStatusEnum,
  masterEntityTypeEnum,
  masterIntegrationTypeEnum,
  masterLabel,
  masterPaymentMethod,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterSetting,
  masterUnitOfMeasure,
  masterUomAlias,
  masterUomCategoryEnum,
  masterUomVersion,
  orgBranch,
  orgBranchTypeEnum,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = mastersTables;
