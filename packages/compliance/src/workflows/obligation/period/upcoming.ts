import type { ComplianceObligation } from "#/db-schemas";
import type { PeriodPreview } from "#/types";
import { toDateOnly, utcMonthEnd, utcMonthStart } from "#/utils/dates";
import { monthsPerFrequency } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

function addMonthsClamped(base: Date, months: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth() + months;
  const day = base.getUTCDate();
  const candidate = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  candidate.setUTCDate(Math.min(day, lastDay));
  return candidate;
}

const getUpcomingPeriods = Workflow.name("obligation.upcoming-periods").handler(
  async (input: { obligation: ComplianceObligation; count: number }, _ctx) => {
    const { obligation, count } = input;
    const periods: PeriodPreview[] = [];
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("count must be an integer >= 0");
    }

    if (obligation.frequency === "custom") {
      // Custom obligations schedule via customCron, not date arithmetic.
      return periods;
    }

    const monthsPerPeriod = monthsPerFrequency(obligation.frequency);
    if (monthsPerPeriod === null) {
      throw new Error(`Unsupported obligation frequency "${obligation.frequency}"`);
    }
    const startDate = new Date(obligation.startDate);
    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth();

    for (let index = 0; index < count; index++) {
      const periodStart = utcMonthStart(startYear, startMonth + index * monthsPerPeriod);
      const periodEnd = utcMonthEnd(startYear, startMonth + index * monthsPerPeriod);

      const entry: PeriodPreview = {
        dueDate: null,
        expiryDate: null,
        periodEnd: null,
        periodStart: null,
      };

      if (obligation.periodBased) {
        entry.periodStart = toDateOnly(periodStart);
        entry.periodEnd = toDateOnly(periodEnd);
      }

      if (obligation.expiryBased && obligation.expiryDurationMonths) {
        const expiryDate = addMonthsClamped(periodStart, obligation.expiryDurationMonths);
        entry.expiryDate = toDateOnly(expiryDate);
      } else if (!obligation.expiryBased) {
        const offset = obligation.dueMonthOffset ?? 0;
        const dueBase = addMonthsClamped(periodEnd, offset);
        if (obligation.dueDay) {
          const lastDay = new Date(
            Date.UTC(dueBase.getUTCFullYear(), dueBase.getUTCMonth() + 1, 0),
          ).getUTCDate();
          dueBase.setUTCDate(Math.min(obligation.dueDay, lastDay));
        }
        entry.dueDate = toDateOnly(dueBase);
      }

      periods.push(entry);
    }

    return periods;
  },
);

export { getUpcomingPeriods };
