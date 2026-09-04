import { masterUnitOfMeasure } from "#/db-schemas";
import type { MasterUnitOfMeasure } from "#/db-schemas/unit-of-measure";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchUnitOfMeasureStep = defineFetchByIdStep<MasterUnitOfMeasure>({
  idColumn: masterUnitOfMeasure.id,
  label: "Unit of measure",
  stepName: "masters-fetch-unit-of-measure",
  table: masterUnitOfMeasure,
});
