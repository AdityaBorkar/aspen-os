import { roundMoney, toDateOnly } from "#/utils/money";

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

export interface DepreciationPeriods {
  perYear: number;
  stepMonths: number;
}

function periodsFor(frequency: string): DepreciationPeriods {
  if (frequency === "monthly") {
    return { perYear: 12, stepMonths: 1 };
  }
  if (frequency === "quarterly") {
    return { perYear: 4, stepMonths: 3 };
  }
  return { perYear: 1, stepMonths: 12 };
}

function periodsPerYear(frequency: string): number {
  return periodsFor(frequency).perYear;
}

function monthsPerPeriod(frequency: string): number {
  return periodsFor(frequency).stepMonths;
}

function addMonths(base: string, months: number): string {
  const date = new Date(`${base}T00:00:00.000Z`);
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return toDateOnly(next);
}

function periodicRate(annualRate: number, perYear: number): number {
  const clamped = Math.min(Math.max(annualRate, 0), 1);
  return 1 - (1 - clamped) ** (1 / perYear);
}

function decliningSchedule(
  availableForUseDate: string,
  bookStart: number,
  periodRate: number,
  residualValue: number,
  stepMonths: number,
  totalPeriods: number,
): ScheduledDepreciationRow[] {
  const rows: ScheduledDepreciationRow[] = [];
  let book = bookStart;
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

  if (depreciationMethod === "straight_line") {
    const perPeriod = roundMoney(depreciable / totalPeriods);
    const rows: ScheduledDepreciationRow[] = [];
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
    return decliningSchedule(
      availableForUseDate,
      grossValue,
      periodicRate(annualRate, perYear),
      residualValue,
      stepMonths,
      totalPeriods,
    );
  }

  const straightRate = 1 / life;
  return decliningSchedule(
    availableForUseDate,
    grossValue,
    periodicRate(Math.min(straightRate * 2, 1), perYear),
    residualValue,
    stepMonths,
    totalPeriods,
  );
}
