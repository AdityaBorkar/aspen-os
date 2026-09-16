import refData from "#/../.generated/ref.json";
import { slugify } from "#/lib/paths";

export type RefData = typeof refData;
export type ModuleRow = RefData["modules"][number];
export type SchemaRow = RefData["schemas"][number];
export type DbSchemaRow = RefData["dbSchemas"][number];
export type WorkflowRow = RefData["workflows"][number];
export type WorkflowStepRow = RefData["workflowSteps"][number];

// Mirrors EventEntry in scripts/generate-ref.ts. Derived as an explicit interface because
// ref.json currently contains zero events, so RefData["events"][number] collapses to never.
export interface EventRow {
  constant: string;
  file: string;
  group: string;
  package: string;
  topic: string;
}

export const REF_DATA: RefData = refData;

export const CONTENT_TABS = [
  {
    blurb: (data: RefData) => `${data.modules.length} modules from packages/*/src/module.ts`,
    description: "Modules from packages/*/src/module.ts",
    label: "Modules",
    slug: "modules",
    url: "/ref/modules",
  },
  {
    blurb: (data: RefData) =>
      `${data.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts`,
    description: "Valibot schemas from packages/*/src/schemas/**/*.ts",
    label: "Schemas",
    slug: "schemas",
    url: "/ref/schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts`,
    description: "Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts",
    label: "DB Schemas",
    slug: "db-schemas",
    url: "/ref/db-schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts`,
    description: "Workflow.name(...) from packages/*/src/workflows/**/*.ts",
    label: "Workflows",
    slug: "workflows",
    url: "/ref/workflows",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflowSteps.length} WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts`,
    description: "WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts",
    label: "Workflow Steps",
    slug: "workflow-steps",
    url: "/ref/workflow-steps",
  },
  {
    blurb: (data: RefData) => `${data.events.length} topics from packages/*/src/pubsub.ts`,
    description: "Topics from packages/*/src/pubsub.ts",
    label: "Events",
    slug: "events",
    url: "/ref/events",
  },
] as const;

export type ContentSlug = (typeof CONTENT_TABS)[number]["slug"];

export const REF_TABS = [
  { label: "Overview", url: "/ref" },
  { label: "Summary", url: "/ref/summary" },
  ...CONTENT_TABS.map((tab) => ({ label: tab.label, url: `/ref/${tab.slug}` })),
] as const;

export const REF_TREE = {
  children: REF_TABS.map((tab) => ({
    name: tab.label,
    type: "page" as const,
    url: tab.url,
  })),
  name: "Reference",
};

export interface ModuleSummary {
  dbSchemas: DbSchemaRow[];
  events: EventRow[];
  module: ModuleRow;
  schemas: SchemaRow[];
  steps: WorkflowStepRow[];
  workflows: WorkflowRow[];
}

export interface WorkflowGroup {
  items: WorkflowRow[];
  prefix: string;
}

export function orDash(value: string): string {
  return value.length > 0 ? value : "—";
}

export function joinOrDash(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}

export function getModuleAnchor(row: ModuleRow): string {
  return slugify(row.name);
}

export function getModuleKey(row: ModuleRow): string {
  return `${row.package}:${row.name}`;
}

export function getSchemaAnchor(row: SchemaRow): string {
  return slugify(`${row.package}-${row.name}`);
}

export function getSchemaKey(row: SchemaRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

export function getDbAnchor(row: DbSchemaRow): string {
  return slugify(row.tableName);
}

export function getDbKey(row: DbSchemaRow): string {
  return `${row.package}:${row.tableName}:${row.name}`;
}

export function getWorkflowAnchor(row: WorkflowRow): string {
  return slugify(row.name);
}

export function getWorkflowKey(row: WorkflowRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

export function getWorkflowStepAnchor(row: WorkflowStepRow): string {
  return slugify(row.name);
}

export function getWorkflowStepKey(row: WorkflowStepRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

export function getEventAnchor(row: EventRow): string {
  return slugify(row.topic);
}

export function getEventKey(row: EventRow): string {
  return `${row.package}:${row.topic}`;
}

export function groupWorkflowsByPrefix(rows: WorkflowRow[]): WorkflowGroup[] {
  const groups = new Map<string, WorkflowRow[]>();
  for (const row of rows) {
    const dot = row.name.indexOf(".");
    const prefix = dot === -1 ? row.name : row.name.slice(0, dot);
    const existing = groups.get(prefix);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(prefix, [row]);
    }
  }
  return [...groups.entries()]
    .map(([prefix, items]) => ({ items, prefix }))
    .toSorted((left, right) => left.prefix.localeCompare(right.prefix));
}

export function buildModuleSummaries(data: RefData, filter: string): ModuleSummary[] {
  const needle = filter.trim().toLowerCase();
  const summaries: ModuleSummary[] = [];
  for (const module of data.modules) {
    if (needle.length > 0 && !`${module.name} ${module.package}`.toLowerCase().includes(needle)) {
      continue;
    }
    summaries.push({
      dbSchemas: data.dbSchemas.filter((row) => row.package === module.package),
      events: data.events.filter((row: EventRow) => row.package === module.package),
      module,
      schemas: data.schemas.filter((row) => row.package === module.package),
      steps: data.workflowSteps.filter((row) => row.package === module.package),
      workflows: data.workflows.filter((row) => row.package === module.package),
    });
  }
  return summaries;
}
