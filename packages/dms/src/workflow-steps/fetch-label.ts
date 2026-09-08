import { makeFetchStep } from "#/workflow-steps/fetch-entity";

import { masterLabel } from "@aspen-os/masters";

export const fetchLabelStep = makeFetchStep("dms-fetch-label", masterLabel, "Label");
