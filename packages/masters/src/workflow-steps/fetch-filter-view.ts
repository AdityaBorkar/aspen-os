import { masterFilterView } from "#/db-schemas";
import type { MasterFilterView } from "#/db-schemas/filter-view";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchFilterViewStep = defineFetchByIdStep<MasterFilterView>({
  idColumn: masterFilterView.id,
  label: "Filter view",
  stepName: "masters-fetch-filter-view",
  table: masterFilterView,
});
