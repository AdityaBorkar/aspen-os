import { masterLabel } from "#/db-schemas";
import type { MasterLabel } from "#/db-schemas/label";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchLabelStep = defineFetchByIdStep<MasterLabel>({
  idColumn: masterLabel.id,
  label: "Label",
  stepName: "masters-fetch-label",
  table: masterLabel,
});
