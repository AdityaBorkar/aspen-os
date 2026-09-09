import { REF_ROUTE } from "#/lib/constants";
import refData from "#/lib/generated/ref.json";
import { githubFileUrl, slugify, trimSlashes } from "#/lib/paths";

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { ReactElement, ReactNode } from "react";

type RefData = typeof refData;
type ModuleRow = RefData["modules"][number];
type SchemaRow = RefData["schemas"][number];
type DbSchemaRow = RefData["dbSchemas"][number];
type WorkflowRow = RefData["workflows"][number];
type WorkflowStepRow = RefData["workflowSteps"][number];
type EventRow = RefData["events"][number];

const CONTENT_TABS = [
  {
    blurb: (data: RefData) => `${data.modules.length} modules from packages/*/src/module.ts`,
    label: "Modules",
    slug: "modules",
  },
  {
    blurb: (data: RefData) =>
      `${data.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts`,
    label: "Schemas",
    slug: "schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts`,
    label: "DB Schemas",
    slug: "db-schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts`,
    label: "Workflows",
    slug: "workflows",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflowSteps.length} WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts`,
    label: "Workflow Steps",
    slug: "workflow-steps",
  },
  {
    blurb: (data: RefData) => `${data.events.length} topics from packages/*/src/pubsub.ts`,
    label: "Events",
    slug: "events",
  },
] as const;

const TABS = [{ label: "Overview", slug: "" }, ...CONTENT_TABS] as const;

type TabSlug = (typeof TABS)[number]["slug"];
type ContentSlug = (typeof CONTENT_TABS)[number]["slug"];

const VALID_SLUGS = new Set<string>(TABS.map((entry) => entry.slug));

function isTabSlug(value: string): value is TabSlug {
  return VALID_SLUGS.has(value);
}

export const Route = createFileRoute("/ref/$")({
  component: RefPage,
  loader: ({ params }) => {
    const slug = trimSlashes(params._splat ?? ""); // oxlint-disable-line no-underscore-dangle
    if (!isTabSlug(slug)) {
      throw notFound();
    }
    return { slug };
  },
});

interface Column<T> {
  cellClass?: string;
  header: string;
  render: (row: T) => ReactNode;
}

function TableWrapper({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border">{children}</div>;
}

function GitHubLink({ file }: { file: string }) {
  return (
    <a className="underline" href={githubFileUrl(file)} rel="noreferrer" target="_blank">
      {file}
    </a>
  );
}

function Anchor({ id, children }: { children: ReactNode; id: string }) {
  return (
    <a className="underline decoration-dotted" href={`#${id}`}>
      {children}
    </a>
  );
}

function DataTable<T>({
  columns,
  getAnchor,
  getKey,
  rows,
}: {
  columns: Column<T>[];
  getAnchor: (row: T) => string;
  getKey: (row: T) => string;
  rows: T[];
}) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-2" key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" id={getAnchor(row)} key={getKey(row)}>
              {columns.map((column) => (
                <td className={`px-3 py-2 font-mono ${column.cellClass ?? ""}`} key={column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function orDash(value: string): string {
  return value.length > 0 ? value : "—";
}

function joinOrDash(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}

const MODULE_COLUMNS: Column<ModuleRow>[] = [
  {
    header: "Module ($name)",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
  { cellClass: "text-xs", header: "Dependencies", render: (row) => joinOrDash(row.dependencies) },
  { cellClass: "text-xs", header: "Consumes", render: (row) => joinOrDash(row.consumes) },
];

const SCHEMA_COLUMNS: Column<SchemaRow>[] = [
  {
    header: "Schema",
    render: (row) => <Anchor id={slugify(`${row.package}-${row.name}`)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const DB_SCHEMA_COLUMNS: Column<DbSchemaRow>[] = [
  {
    header: "Table / Enum",
    render: (row) => <Anchor id={slugify(row.tableName)}>{row.tableName}</Anchor>,
  },
  { cellClass: "text-xs", header: "Variable", render: (row) => row.name },
  { cellClass: "text-xs", header: "Kind", render: (row) => row.kind },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const WORKFLOW_COLUMNS: Column<WorkflowRow>[] = [
  {
    header: "Workflow",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const WORKFLOW_STEP_COLUMNS: Column<WorkflowStepRow>[] = [
  {
    header: "Step",
    render: (row) => <Anchor id={slugify(row.name)}>{row.name}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Export", render: (row) => orDash(row.exportName ?? "") },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const EVENT_COLUMNS: Column<EventRow>[] = [
  {
    header: "Topic",
    render: (row) => <Anchor id={slugify(row.topic)}>{row.topic}</Anchor>,
  },
  { cellClass: "text-xs", header: "Package", render: (row) => row.package },
  { cellClass: "text-xs", header: "Constant", render: (row) => row.constant },
  { cellClass: "text-xs", header: "File", render: (row) => <GitHubLink file={row.file} /> },
];

const TABLES = {
  "db-schemas": {
    render: (data) => (
      <DataTable
        columns={DB_SCHEMA_COLUMNS}
        getAnchor={(row) => slugify(row.tableName)}
        getKey={(row) => `${row.package}:${row.tableName}:${row.name}`}
        rows={data.dbSchemas}
      />
    ),
  },
  events: {
    render: (data) => (
      <DataTable
        columns={EVENT_COLUMNS}
        getAnchor={(row) => slugify(row.topic)}
        getKey={(row) => `${row.package}:${row.topic}`}
        rows={data.events}
      />
    ),
  },
  modules: {
    render: (data) => (
      <DataTable
        columns={MODULE_COLUMNS}
        getAnchor={(row) => slugify(row.name)}
        getKey={(row) => `${row.package}:${row.name}`}
        rows={data.modules}
      />
    ),
  },
  schemas: {
    render: (data) => (
      <DataTable
        columns={SCHEMA_COLUMNS}
        getAnchor={(row) => slugify(`${row.package}-${row.name}`)}
        getKey={(row) => `${row.package}:${row.name}:${row.file}`}
        rows={data.schemas}
      />
    ),
  },
  "workflow-steps": {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_STEP_COLUMNS}
        getAnchor={(row) => slugify(row.name)}
        getKey={(row) => `${row.package}:${row.name}:${row.file}`}
        rows={data.workflowSteps}
      />
    ),
  },
  workflows: {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_COLUMNS}
        getAnchor={(row) => slugify(row.name)}
        getKey={(row) => `${row.package}:${row.name}:${row.file}`}
        rows={data.workflows}
      />
    ),
  },
} satisfies Record<ContentSlug, { render: (data: RefData) => ReactElement }>;

function RefPage() {
  const { slug } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground">
      <header className="sticky top-0 z-20 border-b bg-fd-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link className="font-semibold" to="/">
            Aspen OS
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              className="text-fd-muted-foreground hover:text-fd-foreground"
              params={{ _splat: "platform" }}
              to="/docs/$"
            >
              Docs
            </Link>
            <Link className="font-medium text-fd-foreground" params={{ _splat: "" }} to="/ref/$">
              Reference
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = tab.slug === slug;
            return (
              <Link
                key={tab.slug}
                className={
                  isActive
                    ? "rounded-full bg-fd-primary px-3 py-1 text-sm text-fd-primary-foreground"
                    : "rounded-full border bg-fd-card px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
                }
                params={{ _splat: tab.slug }}
                to="/ref/$"
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="mb-2 text-sm text-fd-muted-foreground">
          {refData.modules.length} modules, {refData.schemas.length} schemas,{" "}
          {refData.dbSchemas.length} db schemas, {refData.workflows.length} workflows,{" "}
          {refData.workflowSteps.length} steps, {refData.events.length} events.
          <span className="ml-2">
            Source: generated at build time via <code>scripts/generate-ref.ts</code>
          </span>
        </div>

        {slug === "" ? <Overview /> : TABLES[slug].render(refData)}
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="prose max-w-none prose-sm dark:prose-invert">
      <h1>Reference</h1>
      <p>
        Auto-generated from <code>packages/*</code> via <code>scripts/generate-ref.ts</code>. Pick a
        section:
      </p>
      <ul>
        {CONTENT_TABS.map((tab) => (
          <li key={tab.slug}>
            <Link className="underline" params={{ _splat: tab.slug }} to="/ref/$">
              {tab.label}
            </Link>{" "}
            — {tab.blurb(refData)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-fd-muted-foreground">
        Endpoint: <code>{REF_ROUTE}/*</code>. Each table row is anchored (e.g.{" "}
        <code>{REF_ROUTE}/workflows#task.create</code>). Data source is generated at build time
        (gitignored, verified with <code>bun run gen:ref --check</code>).
      </p>
    </div>
  );
}
