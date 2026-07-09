import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { connection, connectionContact, connectionNote } from "../db-schema";
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

export class ConnectionWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateConnectionInput) {
    const parsed = parse(CreateConnectionSchema, input);

    const [result] = await this.db
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

    return result;
  }

  async update(id: string, patch: UpdateConnectionInput) {
    await this.getById(id);
    const parsed = parse(UpdateConnectionSchema, patch);

    const [updated] = await this.db
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
      .where(eq(connection.id, id))
      .returning();

    return updated;
  }

  async updateStatus(id: string, status: ConnectionStatus) {
    const current = await this.getById(id);
    const fromStatus = current.status;

    const [updated] = await this.db
      .update(connection)
      .set({ status, updatedAt: new Date() })
      .where(eq(connection.id, id))
      .returning();

    return { connection: updated, fromStatus, toStatus: status };
  }

  async archive(id: string) {
    const [updated] = await this.db
      .update(connection)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(connection.id, id))
      .returning();

    return updated;
  }

  async restore(id: string) {
    const [updated] = await this.db
      .update(connection)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(connection.id, id))
      .returning();

    return updated;
  }

  async list(filters?: ConnectionFilters) {
    const parsed = filters ? parse(ConnectionFiltersSchema, filters) : {};
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.select().from(connection).where(whereClause);
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(connection)
      .where(eq(connection.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Connection with id "${id}" not found.`);
    }

    return result;
  }

  async search(query: string, filters?: ConnectionFilters) {
    const searchTerm = `%${query}%`;
    const parsed = filters ? parse(ConnectionFiltersSchema, filters) : {};
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

    return this.db.select().from(connection).where(whereClause);
  }

  async searchContacts(query: string, connectionId?: string) {
    const searchTerm = `%${query}%`;
    const conditions = [
      or(
        ilike(connectionContact.name, searchTerm),
        ilike(connectionContact.email, searchTerm),
      ),
    ];

    if (connectionId) {
      conditions.push(eq(connectionContact.connectionId, connectionId));
    }

    return this.db
      .select()
      .from(connectionContact)
      .where(and(...conditions));
  }

  async createContact(input: CreateConnectionContactInput) {
    const parsed = parse(CreateConnectionContactSchema, input);

    if (parsed.isPrimary) {
      await this.unsetPrimaryContacts(parsed.connectionId);
    }

    const [result] = await this.db
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
  }

  async updateContact(id: string, patch: UpdateConnectionContactInput) {
    const parsed = parse(UpdateConnectionContactSchema, patch);

    if (parsed.isPrimary === true) {
      const [contact] = await this.db
        .select({ connectionId: connectionContact.connectionId })
        .from(connectionContact)
        .where(eq(connectionContact.id, id))
        .limit(1);

      if (contact) {
        await this.unsetPrimaryContacts(contact.connectionId);
      }
    }

    const [updated] = await this.db
      .update(connectionContact)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(connectionContact.id, id))
      .returning();

    return updated;
  }

  async deleteContact(id: string) {
    await this.db.delete(connectionContact).where(eq(connectionContact.id, id));
  }

  async setPrimaryContact(id: string) {
    const [contact] = await this.db
      .select({ connectionId: connectionContact.connectionId })
      .from(connectionContact)
      .where(eq(connectionContact.id, id))
      .limit(1);

    if (!contact) {
      throw new Error(`Contact with id "${id}" not found.`);
    }

    await this.unsetPrimaryContacts(contact.connectionId);

    const [updated] = await this.db
      .update(connectionContact)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(connectionContact.id, id))
      .returning();

    return updated;
  }

  async listContacts(connectionId: string) {
    return this.db
      .select()
      .from(connectionContact)
      .where(eq(connectionContact.connectionId, connectionId));
  }

  async addNote(input: CreateConnectionNoteInput) {
    const parsed = parse(CreateConnectionNoteSchema, input);

    const [result] = await this.db
      .insert(connectionNote)
      .values({
        connectionId: parsed.connectionId,
        content: parsed.content,
        type: parsed.type,
        userId: parsed.userId,
      })
      .returning();

    return result;
  }

  async listNotes(connectionId: string, type?: string) {
    const conditions = [eq(connectionNote.connectionId, connectionId)];
    if (type) {
      conditions.push(
        eq(
          connectionNote.type,
          type as
            | "call"
            | "contract_renewal"
            | "email"
            | "general"
            | "issue"
            | "meeting",
        ),
      );
    }

    return this.db
      .select()
      .from(connectionNote)
      .where(and(...conditions))
      .orderBy(desc(connectionNote.createdAt));
  }

  private async unsetPrimaryContacts(connectionId: string): Promise<void> {
    await this.db
      .update(connectionContact)
      .set({ isPrimary: false })
      .where(
        and(
          eq(connectionContact.connectionId, connectionId),
          eq(connectionContact.isPrimary, true),
        ),
      );
  }
}
