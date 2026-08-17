import { customType } from "drizzle-orm/pg-core";

export function generateUuidv7(): string {
  const timestamp = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[0] = Math.floor(timestamp / 0x1_00_00_00_00_00) & 0xff;
  bytes[1] = Math.floor(timestamp / 0x1_00_00_00_00) & 0xff;
  bytes[2] = Math.floor(timestamp / 0x1_00_00_00) & 0xff;
  bytes[3] = Math.floor(timestamp / 0x1_00_00) & 0xff;
  bytes[4] = Math.floor(timestamp / 0x1_00) & 0xff;
  bytes[5] = timestamp & 0xff;
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Drizzle `text` column that generates a UUIDv7 at insert time in JS.
 *
 * Drop-in replacement for the previous
 * `text("id").primaryKey().$defaultFn(uuidv7)` incantation:
 * the generated default is baked into the type, so schemas write
 * `id: uuidv7("id").primaryKey()` directly.
 */
const uuidv7Builder = customType<{ data: string; driverData: string; default: true }>({
  dataType: () => "text",
});

export function uuidv7<TName extends string>(name: TName) {
  return uuidv7Builder<TName>(name).$defaultFn(generateUuidv7);
}
