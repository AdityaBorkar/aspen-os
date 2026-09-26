import { OrganizationBrandingSchema } from "#/schemas/organization";

import type { JsonValue } from "@aspen-os/platform/server";
import { nullable, safeParse } from "valibot";

const NullableBrandingSchema = nullable(OrganizationBrandingSchema);

export function readBrandingLogo(branding: JsonValue | null): string | null {
  const parsed = safeParse(NullableBrandingSchema, branding);
  if (!parsed.success) {
    return null;
  }
  return parsed.output?.logo ?? null;
}

export function brandingWithLogo(branding: JsonValue | null, logo: string | null): JsonValue {
  const parsed = safeParse(NullableBrandingSchema, branding);
  const existing = parsed.success && parsed.output ? parsed.output : {};
  return { ...existing, logo };
}
