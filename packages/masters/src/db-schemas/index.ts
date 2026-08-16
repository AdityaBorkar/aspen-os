import { masterAddress } from "#/db-schemas/address";
import { masterBankAccount } from "#/db-schemas/bank-account";
import { masterConnection } from "#/db-schemas/connection";
import { masterContact } from "#/db-schemas/contact";
import { masterEntity } from "#/db-schemas/entity";
import { masterPaymentMethod } from "#/db-schemas/payment-method";
import { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

export { masterAddress } from "#/db-schemas/address";
export { masterBankAccount } from "#/db-schemas/bank-account";
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
  masterIntegrationTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterUomCategoryEnum,
} from "#/db-schemas/enums";
export { masterPaymentMethod } from "#/db-schemas/payment-method";
export { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

export const mastersTables = {
  masterAddress,
  masterBankAccount,
  masterConnection,
  masterContact,
  masterEntity,
  masterPaymentMethod,
  masterUnitOfMeasure,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = mastersTables;
