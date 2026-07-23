import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

import { organization } from "../db-schemas";
import { ORGANIZATION_EVENTS } from "../pubsub-events";
import {
  CreateOrganizationSchema,
  SlugSchema,
  UpdateBrandingSchema,
  UpdateOrganizationSchema,
} from "../types";
import { generateSlug, stripUndefined } from "./utils";

const fetchOrganizationStep = WorkflowStep.name("fetch-organization").handler(
  async (_input: Record<string, never>, ctx) => {
    const [org] = await ctx.db.select().from(organization).limit(1);
    return org ?? null;
  },
);

const createOrganization = Workflow.name("org.create").handler(
  async (
    input: {
      accentColor?: string;
      address?: string | null;
      email?: string | null;
      foundedDate?: Date;
      industry?: string | null;
      locale?: string;
      metadata?: Record<string, unknown> | null;
      name: string;
      phone?: string | null;
      registrationNumber?: string | null;
      slug?: string;
      taxId?: string | null;
      timezone?: string;
      website?: string | null;
    },
    ctx,
  ) => {
    const parsed = parse(CreateOrganizationSchema, input);

    const slug = parsed.slug ?? generateSlug(parsed.name);
    parse(SlugSchema, slug);

    const [existing] = await ctx.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (existing) {
      throw new Error(`Organization with slug "${slug}" already exists.`);
    }

    const [org] = await ctx.db
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
  },
);

const getOrganization = Workflow.name("org.get").handler(
  async (_input: Record<string, never>, ctx) => {
    return ctx.step.run(fetchOrganizationStep, {});
  },
);

const updateOrganization = Workflow.name("org.update").handler(
  async (
    input: {
      accentColor?: string;
      address?: string | null;
      email?: string | null;
      foundedDate?: Date;
      industry?: string | null;
      locale?: string;
      logo?: string | null;
      metadata?: Record<string, unknown> | null;
      name?: string;
      phone?: string | null;
      registrationNumber?: string | null;
      slug?: string;
      status?: string;
      taxId?: string | null;
      timezone?: string;
      website?: string | null;
    },
    ctx,
  ) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const parsed = parse(UpdateOrganizationSchema, input);
    const data = stripUndefined(parsed as Record<string, unknown>);

    if (Object.keys(data).length === 0) return current;

    if (parsed.slug !== undefined) {
      const [conflict] = await ctx.db
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

    const [updated] = await ctx.db
      .update(organization)
      .set({
        ...data,
        foundedDate:
          parsed.foundedDate?.toISOString().split("T")[0] ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update organization.");
    }

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
      changes: data,
      organization: { id: updated.id, name: updated.name, slug: updated.slug },
    });

    return updated;
  },
);

const updateBranding = Workflow.name("org.update-branding").handler(
  async (
    input: { accentColor?: string; logo?: string | null; name?: string },
    ctx,
  ) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const parsed = parse(UpdateBrandingSchema, input);

    const [updated] = await ctx.db
      .update(organization)
      .set({
        accentColor: parsed.accentColor ?? current.accentColor,
        logo: parsed.logo ?? current.logo,
        name: parsed.name ?? current.name,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update branding.");
    }

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.BRANDING_UPDATED, {
      accentColor: parsed.accentColor,
      logo: parsed.logo,
      name: parsed.name,
    });

    return updated;
  },
);

const uploadLogo = Workflow.name("org.upload-logo").handler(
  async (input: { storageKey: string }, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({ logo: input.storageKey, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to upload logo.");
    }

    return updated;
  },
);

const deleteLogo = Workflow.name("org.delete-logo").handler(
  async (_input: Record<string, never>, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({ logo: null, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to delete logo.");
    }

    return updated;
  },
);

export const organizations = {
  create: createOrganization,
  deleteLogo,
  get: getOrganization,
  update: updateOrganization,
  updateBranding,
  uploadLogo,
};
