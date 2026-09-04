import { masterEntity } from "#/db-schemas";
import type { MasterEntity } from "#/db-schemas/entity";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchEntityStep = defineFetchByIdStep<MasterEntity>({
  idColumn: masterEntity.id,
  label: "Entity",
  stepName: "masters-fetch-entity",
  table: masterEntity,
});
