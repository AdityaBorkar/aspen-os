import { Workflow, WorkflowStep } from "@aspen-os/framework/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { connection, connectionContact, connectionNote } from "../db-schemas";
import { CONNECTION_EVENTS } from "../pubsub-events";
import type {
  ConnectionFilters,
  ConnectionStatus,
  CreateConnectionContactInput,
  CreateConnectionInput,
  CreateConnectionNoteInput,
  UpdateConnectionContactInput,
  UpdateConnectionInput,
} from "../types";
import {
  ConnectionFiltersSchema,
  CreateConnectionContactSchema,
  CreateConnectionNoteSchema,
  CreateConnectionSchema,
  UpdateConnectionContactSchema,
  UpdateConnectionSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

const CreateInputSchema = object({ input: CreateConnectionSchema });

const fetchConnectionStep = WorkflowStep.name("fetch-connection").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(connection)
      .where(eq(connection.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createConnection = Workflow.name("connection.create").handler(
  async (input: { input: CreateConnectionInput }, ctx) => {
    const { input: parsed } = parse(CreateInputSchema, input);

    const [result] = await ctx.db
      .insert(connection)
      .values({
        address: parsed.address ?? null,
        annualRevenue: parsed.annualRevenue?.toString() ?? null,
        contactEmail: parsed.contactEmail ?? null,
        contactPerson: parsed.contactPerson ?? null,
        contactPhone: parsed.contactPhone ?? null,
        contractValue: parsed.contractValue?.toString() ?? null,
        createdBy: parsed.createdBy,
        industry: parsed.industry ?? null,
        logo: parsed.logo ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        notes: parsed.notes ?? null,
        relationshipEndDate:
          parsed.relationshipEndDate?.toISOString().split("T")[0] ?? null,
        relationshipStartDate:
          parsed.relationshipStartDate?.toISOString().split("T")[0] ?? null,
        tags: parsed.tags ?? [],
        taxId: parsed.taxId ?? null,
        type: parsed.type,
        website: parsed.website ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create connection.");
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.CREATED, {
      connection: {
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  },
);

const getConnection = Workflow.name("connection.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchConnectionStep, { id: input.id });
  },
);

const listConnections = Workflow.name("connection.list").handler(
  async (input: { filters?: ConnectionFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(ConnectionFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(connection.type, parsed.type));
      }
      if (parsed.status) {
        conditions.push(eq(connection.status, parsed.status));
      }
      if (parsed.tags && parsed.tags.length > 0) {
        conditions.push(sql`${connection.tags} && ${parsed.tags}`);
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          sql`(${connection.name} ilike ${term} or ${connection.contactPerson} ilike ${term})`,
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(connection).where(whereClause);
    });
  },
);

const updateConnection = Workflow.name("connection.update").handler(
  async (input: { id: string; patch: UpdateConnectionInput }, ctx) => {
    await ctx.step.run(fetchConnectionStep, { id: input.id });
    const parsed = parse(UpdateConnectionSchema, input.patch);

    const [updated] = await ctx.db
      .update(connection)
      .set({
        address: parsed.address,
        annualRevenue: parsed.annualRevenue?.toString(),
        contactEmail: parsed.contactEmail,
        contactPerson: parsed.contactPerson,
        contactPhone: parsed.contactPhone,
        contractValue: parsed.contractValue?.toString(),
        industry: parsed.industry,
        logo: parsed.logo,
        metadata: parsed.metadata,
        name: parsed.name,
        notes: parsed.notes,
        relationshipEndDate:
          parsed.relationshipEndDate?.toISOString().split("T")[0] ?? undefined,
        relationshipStartDate:
          parsed.relationshipStartDate?.toISOString().split("T")[0] ??
          undefined,
        tags: parsed.tags,
        taxId: parsed.taxId,
        type: parsed.type,
        updatedAt: new Date(),
        website: parsed.website,
      })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.UPDATED, {
      changes: parsed as Record<string, unknown>,
      connection: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

const updateStatus = Workflow.name("connection.update-status").handler(
  async (input: { id: string; status: ConnectionStatus }, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });
    const fromStatus = current.status;

    const [updated] = await ctx.db
      .update(connection)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.STATUS_CHANGED, {
      connectionId: input.id,
      fromStatus: fromStatus as ConnectionStatus,
      toStatus: input.status,
    });

    return { connection: updated, fromStatus, toStatus: input.status };
  },
);

const archiveConnection = Workflow.name("connection.archive").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(connection)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    return updated;
  },
);

const restoreConnection = Workflow.name("connection.restore").handler(
  async (input: { id: string }, ctx) => {
    const [updated] = await ctx.db
      .update(connection)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    return updated;
  },
);

const searchConnections = Workflow.name("connection.search").handler(
  async (input: { query: string; filters?: ConnectionFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const searchTerm = `%${input.query}%`;
      const parsed = input.filters
        ? parse(ConnectionFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(connection.type, parsed.type));
      }
      if (parsed.status) {
        conditions.push(eq(connection.status, parsed.status));
      }
      if (parsed.tags && parsed.tags.length > 0) {
        conditions.push(sql`${connection.tags} && ${parsed.tags}`);
      }

      const searchCondition = or(
        ilike(connection.name, searchTerm),
        ilike(connection.contactPerson, searchTerm),
        sql`${connection.tags}::text ilike ${searchTerm}`,
      );

      const whereClause =
        conditions.length > 0
          ? and(searchCondition, ...conditions)
          : searchCondition;

      return ctx.db.select().from(connection).where(whereClause);
    });
  },
);

const searchContacts = Workflow.name("connection.search-contacts").handler(
  async (input: { query: string; connectionId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const searchTerm = `%${input.query}%`;
      const conditions = [
        or(
          ilike(connectionContact.name, searchTerm),
          ilike(connectionContact.email, searchTerm),
        ),
      ];

      if (input.connectionId) {
        conditions.push(eq(connectionContact.connectionId, input.connectionId));
      }

      return ctx.db
        .select()
        .from(connectionContact)
        .where(and(...conditions));
    });
  },
);

const createContact = Workflow.name("connection.create-contact").handler(
  async (input: { input: CreateConnectionContactInput }, ctx) => {
    const parsed = parse(
      object({ input: CreateConnectionContactSchema }),
      input,
    ).input;

    if (parsed.isPrimary) {
      await unsetPrimaryContacts(ctx.db, parsed.connectionId);
    }

    const [result] = await ctx.db
      .insert(connectionContact)
      .values({
        connectionId: parsed.connectionId,
        email: parsed.email ?? null,
        isPrimary: parsed.isPrimary ?? false,
        name: parsed.name,
        notes: parsed.notes ?? null,
        phone: parsed.phone ?? null,
        title: parsed.title ?? null,
      })
      .returning();

    return result;
  },
);

const updateContact = Workflow.name("connection.update-contact").handler(
  async (input: { id: string; patch: UpdateConnectionContactInput }, ctx) => {
    const parsed = parse(UpdateConnectionContactSchema, input.patch);

    if (parsed.isPrimary === true) {
      const [contact] = await ctx.db
        .select({ connectionId: connectionContact.connectionId })
        .from(connectionContact)
        .where(eq(connectionContact.id, input.id))
        .limit(1);

      if (contact) {
        await unsetPrimaryContacts(ctx.db, contact.connectionId);
      }
    }

    const [updated] = await ctx.db
      .update(connectionContact)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(connectionContact.id, input.id))
      .returning();

    return updated;
  },
);

const deleteContact = Workflow.name("connection.delete-contact").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db
      .delete(connectionContact)
      .where(eq(connectionContact.id, input.id));
  },
);

const setPrimaryContact = Workflow.name(
  "connection.set-primary-contact",
).handler(async (input: { id: string }, ctx) => {
  const [contact] = await ctx.db
    .select({ connectionId: connectionContact.connectionId })
    .from(connectionContact)
    .where(eq(connectionContact.id, input.id))
    .limit(1);

  if (!contact) {
    throw new Error(`Contact with id "${input.id}" not found.`);
  }

  await unsetPrimaryContacts(ctx.db, contact.connectionId);

  const [updated] = await ctx.db
    .update(connectionContact)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(connectionContact.id, input.id))
    .returning();

  return updated;
});

const listContacts = Workflow.name("connection.list-contacts").handler(
  async (input: { connectionId: string }, ctx) => {
    return ctx.db
      .select()
      .from(connectionContact)
      .where(eq(connectionContact.connectionId, input.connectionId));
  },
);

const addNote = Workflow.name("connection.add-note").handler(
  async (input: { input: CreateConnectionNoteInput }, ctx) => {
    const parsed = parse(
      object({ input: CreateConnectionNoteSchema }),
      input,
    ).input;

    const [result] = await ctx.db
      .insert(connectionNote)
      .values({
        connectionId: parsed.connectionId,
        content: parsed.content,
        type: parsed.type,
        userId: parsed.userId,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to add note.");
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.NOTE_ADDED, {
      connectionId: parsed.connectionId,
      note: {
        content: result.content,
        id: result.id,
        type: result.type,
      },
    });

    return result;
  },
);

const listNotes = Workflow.name("connection.list-notes").handler(
  async (input: { connectionId: string; type?: string }, ctx) => {
    const conditions = [eq(connectionNote.connectionId, input.connectionId)];
    if (input.type) {
      conditions.push(
        eq(
          connectionNote.type,
          input.type as
            | "call"
            | "contract_renewal"
            | "email"
            | "general"
            | "issue"
            | "meeting",
        ),
      );
    }

    return ctx.db
      .select()
      .from(connectionNote)
      .where(and(...conditions))
      .orderBy(desc(connectionNote.createdAt));
  },
);

async function unsetPrimaryContacts(
  db: DrizzleDB,
  connectionId: string,
): Promise<void> {
  await db
    .update(connectionContact)
    .set({ isPrimary: false })
    .where(
      and(
        eq(connectionContact.connectionId, connectionId),
        eq(connectionContact.isPrimary, true),
      ),
    );
}

export const connections = {
  addNote,
  archive: archiveConnection,
  create: createConnection,
  createContact,
  deleteContact,
  get: getConnection,
  list: listConnections,
  listContacts,
  listNotes,
  restore: restoreConnection,
  search: searchConnections,
  searchContacts,
  setPrimaryContact,
  update: updateConnection,
  updateContact,
  updateStatus,
};
