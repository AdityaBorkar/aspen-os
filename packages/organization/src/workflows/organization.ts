import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { organization } from "../db-schema";
import type {
  CreateOrganizationInput,
  UpdateBrandingInput,
  UpdateOrganizationInput,
} from "../types";
import {
  CreateOrganizationSchema,
  SlugSchema,
  UpdateBrandingSchema,
  UpdateOrganizationSchema,
} from "../types";

const SLUG_MAX_LENGTH = 63;

export class OrganizationWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async get() {
    const [org] = await this.db.select().from(organization).limit(1);
    return org ?? null;
  }

  async create(input: CreateOrganizationInput) {
    const parsed = parse(CreateOrganizationSchema, input);

    const slug = parsed.slug ?? this.generateSlug(parsed.name);
    parse(SlugSchema, slug);

    const [existing] = await this.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (existing) {
      throw new Error(`Organization with slug "${slug}" already exists.`);
    }

    const [org] = await this.db
      .insert(organization)
      .values({
        accentColor: parsed.accentColor,
        address: parsed.address ?? null,
        email: parsed.email ?? null,
        foundedDate: parsed.foundedDate?.toISOString().split("T")[0] ?? null,
        industry: parsed.industry ?? null,
        locale: parsed.locale ?? "en-US",
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        phone: parsed.phone ?? null,
        registrationNumber: parsed.registrationNumber ?? null,
        slug,
        taxId: parsed.taxId ?? null,
        timezone: parsed.timezone ?? "UTC",
        website: parsed.website ?? null,
      })
      .returning();

    return org;
  }

  async update(patch: UpdateOrganizationInput) {
    const current = await this.get();
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const parsed = parse(UpdateOrganizationSchema, patch);

    if (parsed.slug !== undefined) {
      const [conflict] = await this.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.slug, parsed.slug))
        .limit(1);

      if (conflict && conflict.id !== current.id) {
        throw new Error(
          `Organization with slug "${parsed.slug}" already exists.`,
        );
      }
    }

    const [updated] = await this.db
      .update(organization)
      .set({
        ...parsed,
        foundedDate:
          parsed.foundedDate?.toISOString().split("T")[0] ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    return updated;
  }

  async updateBranding(patch: UpdateBrandingInput) {
    const current = await this.get();
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const parsed = parse(UpdateBrandingSchema, patch);

    const [updated] = await this.db
      .update(organization)
      .set({
        accentColor: parsed.accentColor ?? current.accentColor,
        logo: parsed.logo ?? current.logo,
        name: parsed.name ?? current.name,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    return updated;
  }

  async uploadLogo(storageKey: string) {
    const current = await this.get();
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await this.db
      .update(organization)
      .set({ logo: storageKey, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    return updated;
  }

  async deleteLogo() {
    const current = await this.get();
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await this.db
      .update(organization)
      .set({ logo: null, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    return updated;
  }

  private generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return slug.slice(0, SLUG_MAX_LENGTH);
  }
}
