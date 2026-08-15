import type { ComplianceObligation } from "#/db-schemas";
import type { PeriodPreview } from "#/types";
import { MONTHS_PER_FREQUENCY } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

const getUpcomingPeriods = Workflow.name("obligation.upcoming-periods").handler(
  async (input: { obligation: ComplianceObligation; count: number }, _ctx) => {
    const { obligation, count } = input;
    const periods: PeriodPreview[] = [];
    const startDate = new Date(obligation.startDate);

    if (obligation.frequency === "custom") {
      return periods;
    }

    const monthsPerPeriod = MONTHS_PER_FREQUENCY[obligation.frequency] ?? 1;

    for (let index = 0; index < count; index++) {
      const periodStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + index * monthsPerPeriod,
        1,
      );
      const periodEnd = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + (index + 1) * monthsPerPeriod,
        0,
      );

      const entry: PeriodPreview = {
        dueDate: null,
        expiryDate: null,
        periodEnd: null,
        periodStart: null,
      };

      if (obligation.periodBased) {
        entry.periodStart = periodStart.toISOString().split("T")[0] ?? null;
        entry.periodEnd = periodEnd.toISOString().split("T")[0] ?? null;
      }

      if (obligation.expiryBased && obligation.expiryDurationMonths) {
        const expiryDate = new Date(periodStart);
        expiryDate.setMonth(expiryDate.getMonth() + obligation.expiryDurationMonths);
        entry.expiryDate = expiryDate.toISOString().split("T")[0] ?? null;
      } else if (!obligation.expiryBased) {
        const dueDate = new Date(periodEnd);
        const offset = obligation.dueMonthOffset ?? 0;
        dueDate.setMonth(dueDate.getMonth() + offset);
        if (obligation.dueDay) {
          const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate.setDate(Math.min(obligation.dueDay, lastDay));
        }
        entry.dueDate = dueDate.toISOString().split("T")[0] ?? null;
      }

      periods.push(entry);
    }

    return periods;
  },
);

export { getUpcomingPeriods };
