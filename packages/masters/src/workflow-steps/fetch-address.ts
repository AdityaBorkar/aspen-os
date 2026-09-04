import { masterAddress } from "#/db-schemas";
import type { MasterAddress } from "#/db-schemas/address";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchAddressStep = defineFetchByIdStep<MasterAddress>({
  idColumn: masterAddress.id,
  label: "Address",
  stepName: "masters-fetch-address",
  table: masterAddress,
});
