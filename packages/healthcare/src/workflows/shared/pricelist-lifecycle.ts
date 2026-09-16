import { DEFAULT_PRICELIST_CODE } from "#/workflows/pricelists/shared";

export function toPricelistCode(name: string): string {
  const code = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!code) {
    throw new Error("Pricelist needs a usable code; check the name and retry");
  }
  return code;
}

export function assertPricelistCodeAllowed(code: string): void {
  if (code.toUpperCase() === DEFAULT_PRICELIST_CODE) {
    throw new Error(
      'The "DEFAULT" code is reserved for the seeded fallback pricelist; pick another code.',
    );
  }
}

export function nextPricelistVersion(priorVersion?: number): number {
  return (priorVersion ?? 0) + 1;
}
