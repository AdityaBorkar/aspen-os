import { masterConnection } from "#/db-schemas";
import type { MasterConnection } from "#/db-schemas/connection";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchConnectionStep = defineFetchByIdStep<MasterConnection>({
  idColumn: masterConnection.id,
  label: "Connection",
  stepName: "masters-fetch-connection",
  table: masterConnection,
});
