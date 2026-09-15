export interface ConvertQuantityMathInput {
  fromFactor: number;
  quantity: number;
  toFactor: number;
  toIndivisible: boolean;
  toPrecision: number;
}

export interface ConvertQuantityMathResult {
  baseQuantity: number;
  convertedQuantity: number;
}

export function roundHalfUp(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function convertQuantityMath(input: ConvertQuantityMathInput): ConvertQuantityMathResult {
  const baseQuantity = input.quantity * input.fromFactor;
  const raw = baseQuantity / input.toFactor;
  const convertedQuantity = roundHalfUp(raw, input.toPrecision);
  if (input.toIndivisible && !Number.isInteger(convertedQuantity)) {
    throw new Error(
      `Quantity ${input.quantity} converts to ${convertedQuantity}, but the target unit cannot be split — enter a whole quantity.`,
    );
  }
  return { baseQuantity, convertedQuantity };
}

export function assertWholeQuantity(quantity: number, label: string): void {
  if (!Number.isInteger(quantity)) {
    throw new Error(`${label} cannot be split — enter a whole quantity (got ${quantity}).`);
  }
}
