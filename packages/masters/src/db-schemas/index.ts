import { masterAddress } from "#/db-schemas/address";
import { masterBankAccount } from "#/db-schemas/bank-account";
import { masterConnection } from "#/db-schemas/connection";
import { masterContact } from "#/db-schemas/contact";
import { masterEntity } from "#/db-schemas/entity";
import { masterNote } from "#/db-schemas/note";
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
  masterNoteTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
  masterUomCategoryEnum,
} from "#/db-schemas/enums";
export { masterNote } from "#/db-schemas/note";
export { masterPaymentMethod } from "#/db-schemas/payment-method";
export { masterUnitOfMeasure } from "#/db-schemas/unit-of-measure";

export const mastersTables = {
  masterAddress,
  masterBankAccount,
  masterConnection,
  masterContact,
  masterEntity,
  masterNote,
  masterPaymentMethod,
  masterUnitOfMeasure,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = mastersTables;
