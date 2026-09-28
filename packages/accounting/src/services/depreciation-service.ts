import { parseMoney, roundMoney, toDateOnly } from "#/utils/money";

export interface DepreciationBookInput {
  availableForUseDate: string;
  depreciationMethod: string;
  frequency: string;
  grossValue: number;
  residualValue: number;
  usefulLifeYears: number;
}

export interface ScheduledDepreciationRow {
  amount: number;
  expectedDate: string;
}

function periodsPerYear(frequency: string): number {
  if (frequency === "monthly") {
    return 12;
  }
  if (frequency === "quarterly") {
    return 4;
  }
  return 1;
}

function monthsPerPeriod(frequency: string): number {
  if (frequency === "monthly") {
    return 1;
  }
  if (frequency === "quarterly") {
    return 3;
  }
  return 12;
}

function addMonths(base: string, months: number): string {
  const date = new Date(`${base}T00:00:00.000Z`);
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return toDateOnly(next);
}

export function buildDepreciationSchedule(
  input: DepreciationBookInput,
): ScheduledDepreciationRow[] {
  const {
    availableForUseDate,
    depreciationMethod,
    frequency,
    grossValue,
    residualValue,
    usefulLifeYears,
  } = input;
  const depreciable = roundMoney(grossValue - residualValue);
  if (depreciable <= 0) {
    return [];
  }
  const life = Math.max(1, Math.trunc(usefulLifeYears));
  const perYear = periodsPerYear(frequency);
  const totalPeriods = life * perYear;
  const stepMonths = monthsPerPeriod(frequency);
  const rows: ScheduledDepreciationRow[] = [];

  if (depreciationMethod === "straight_line") {
    const perPeriod = roundMoney(depreciable / totalPeriods);
    let remaining = depreciable;
    for (let index = 1; index <= totalPeriods; index += 1) {
      const isLast = index === totalPeriods;
      const amount = isLast ? roundMoney(remaining) : perPeriod;
      remaining = roundMoney(remaining - amount);
      rows.push({ amount, expectedDate: addMonths(availableForUseDate, index * stepMonths) });
    }
    return rows;
  }

  if (depreciationMethod === "written_down_value") {
    const annualRate = 1 - (residualValue / Math.max(grossValue, 0.01)) ** (1 / life);
    const clampedRate = Math.min(Math.max(annualRate, 0), 1);
    const periodRate = 1 - (1 - clampedRate) ** (1 / perYear);
    let book = grossValue;
    for (let index = 1; index <= totalPeriods; index += 1) {
      const isLast = index === totalPeriods;
      let amount = roundMoney(book * periodRate);
      const maxAllowed = roundMoney(book - residualValue);
      if (amount > maxAllowed) {
        amount = maxAllowed;
      }
      if (isLast) {
        amount = roundMoney(book - residualValue);
      }
      if (amount <= 0) {
        break;
      }
      book = roundMoney(book - amount);
      rows.push({ amount, expectedDate: addMonths(availableForUseDate, index * stepMonths) });
      if (book <= residualValue + 0.005) {
        break;
      }
    }
    return rows;
  }

  let bookValue = grossValue;
  const straightRate = 1 / life;
  const ddbAnnual = Math.min(straightRate * 2, 1);
  const ddbPeriod = 1 - (1 - ddbAnnual) ** (1 / perYear);
  for (let index = 1; index <= totalPeriods; index += 1) {
    const isLast = index === totalPeriods;
    let amount = roundMoney(bookValue * ddbPeriod);
    const maxAllowed = roundMoney(bookValue - residualValue);
    if (amount > maxAllowed) {
      amount = maxAllowed;
    }
    if (isLast) {
      amount = roundMoney(bookValue - residualValue);
    }
    if (amount <= 0) {
      break;
    }
    void parseMoney("0");
    bookValue = roundMoney(bookValue - amount);
    rows.push({ amount, expectedDate: addMonths(availableForUseDate, index * stepMonths) });
    if (bookValue <= residualValue + 0.005) {
      break;
    }
  }
  return rows;
}
