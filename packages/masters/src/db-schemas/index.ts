import { masterAddress } from "#/db-schemas/address";
import { masterConnection } from "#/db-schemas/connection";
import { masterContact } from "#/db-schemas/contact";
import { masterEntity } from "#/db-schemas/entity";
import { masterFilterView } from "#/db-schemas/filter-view";
import { masterPaymentMethod } from "#/db-schemas/payment-method";
import { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

export { masterAddress } from "#/db-schemas/address";
export { masterConnection } from "#/db-schemas/connection";
export { masterContact } from "#/db-schemas/contact";
export { masterEntity } from "#/db-schemas/entity";
export {
  masterCardBrandEnum,
  masterConnectionStatusEnum,
  masterContactTypeEnum,
  masterEntityKindEnum,
  masterEntityStatusEnum,
  masterEntityTypeEnum,
  masterFilterViewAccessEnum,
  masterFilterViewTypeEnum,
  masterIntegrationTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterUomCategoryEnum,
} from "#/db-schemas/enums";
export { masterFilterView } from "#/db-schemas/filter-view";
export { masterPaymentMethod } from "#/db-schemas/payment-method";
export { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

export const mastersTables = {
  masterAddress,
  masterConnection,
  masterContact,
  masterEntity,
  masterFilterView,
  masterPaymentMethod,
  masterUnitOfMeasure,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = mastersTables;
