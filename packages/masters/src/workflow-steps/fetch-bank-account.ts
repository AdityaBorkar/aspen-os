import { masterBankAccount } from "#/db-schemas";
import type { MasterBankAccount } from "#/db-schemas/bank-account";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchBankAccountStep = defineFetchByIdStep<MasterBankAccount>({
  idColumn: masterBankAccount.id,
  label: "Bank account",
  stepName: "masters-fetch-bank-account",
  table: masterBankAccount,
});
