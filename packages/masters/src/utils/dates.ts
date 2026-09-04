export function toDateOnly(value: Date): string {
  return value.toISOString().split("T")[0] ?? "";
}
