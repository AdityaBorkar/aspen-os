import refData from "#/../.generated/ref.json";
import { WorkflowDiagram } from "#/components/ref-workflow-diagram";
import { REF_ROUTE } from "#/lib/constants";
import { githubFileUrl, slugify, trimSlashes } from "#/lib/paths";

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useState } from "react";
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
    count: (data: RefData) => data.modules.length,
    label: "Modules",
    slug: "modules",
  },
  {
    blurb: (data: RefData) =>
      `${data.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts`,
    count: (data: RefData) => data.schemas.length,
    label: "Schemas",
    slug: "schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts`,
    count: (data: RefData) => data.dbSchemas.length,
    label: "DB Schemas",
    slug: "db-schemas",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts`,
    count: (data: RefData) => data.workflows.length,
    label: "Workflows",
    slug: "workflows",
  },
  {
    blurb: (data: RefData) =>
      `${data.workflowSteps.length} WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts`,
    count: (data: RefData) => data.workflowSteps.length,
    label: "Workflow Steps",
    slug: "workflow-steps",
  },
  {
    blurb: (data: RefData) => `${data.events.length} topics from packages/*/src/pubsub.ts`,
    count: (data: RefData) => data.events.length,
    label: "Events",
    slug: "events",
  },
] as const;

const TABS = [{ label: "Overview", slug: "" }, ...CONTENT_TABS] as const;

type TabSlug = (typeof TABS)[number]["slug"];
type ContentSlug = (typeof CONTENT_TABS)[number]["slug"];
type WorkflowView = "diagram" | "table";

const VALID_SLUGS = new Set<string>(TABS.map((entry) => entry.slug));

const DOCS_LINK_PARAMS = { _splat: "platform" } as const;
const REF_OVERVIEW_PARAMS = { _splat: "" } as const;

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

interface Column<Row> {
  cellClass?: string;
  header: string;
  render: (row: Row) => ReactNode;
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

function DataTable<Row>({
  columns,
  getAnchor,
  getKey,
  rows,
}: {
  columns: Column<Row>[];
  getAnchor: (row: Row) => string;
  getKey: (row: Row) => string;
  rows: Row[];
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

function getModuleAnchor(row: ModuleRow): string {
  return slugify(row.name);
}

function getModuleKey(row: ModuleRow): string {
  return `${row.package}:${row.name}`;
}

function getSchemaAnchor(row: SchemaRow): string {
  return slugify(`${row.package}-${row.name}`);
}

function getSchemaKey(row: SchemaRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getDbAnchor(row: DbSchemaRow): string {
  return slugify(row.tableName);
}

function getDbKey(row: DbSchemaRow): string {
  return `${row.package}:${row.tableName}:${row.name}`;
}

function getWorkflowAnchor(row: WorkflowRow): string {
  return slugify(row.name);
}

function getWorkflowKey(row: WorkflowRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getWorkflowStepAnchor(row: WorkflowStepRow): string {
  return slugify(row.name);
}

function getWorkflowStepKey(row: WorkflowStepRow): string {
  return `${row.package}:${row.name}:${row.file}`;
}

function getEventAnchor(row: EventRow): string {
  return slugify(row.topic);
}

function getEventKey(row: EventRow): string {
  return `${row.package}:${row.topic}`;
}

const TABLES = {
  "db-schemas": {
    render: (data) => (
      <DataTable
        columns={DB_SCHEMA_COLUMNS}
        getAnchor={getDbAnchor}
        getKey={getDbKey}
        rows={data.dbSchemas}
      />
    ),
  },
  events: {
    render: (data) => (
      <DataTable
        columns={EVENT_COLUMNS}
        getAnchor={getEventAnchor}
        getKey={getEventKey}
        rows={data.events}
      />
    ),
  },
  modules: {
    render: (data) => (
      <DataTable
        columns={MODULE_COLUMNS}
        getAnchor={getModuleAnchor}
        getKey={getModuleKey}
        rows={data.modules}
      />
    ),
  },
  schemas: {
    render: (data) => (
      <DataTable
        columns={SCHEMA_COLUMNS}
        getAnchor={getSchemaAnchor}
        getKey={getSchemaKey}
        rows={data.schemas}
      />
    ),
  },
  "workflow-steps": {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_STEP_COLUMNS}
        getAnchor={getWorkflowStepAnchor}
        getKey={getWorkflowStepKey}
        rows={data.workflowSteps}
      />
    ),
  },
  workflows: {
    render: (data) => (
      <DataTable
        columns={WORKFLOW_COLUMNS}
        getAnchor={getWorkflowAnchor}
        getKey={getWorkflowKey}
        rows={data.workflows}
      />
    ),
  },
} satisfies Record<ContentSlug, { render: (data: RefData) => ReactElement }>;

function RefPage() {
  const { slug } = Route.useLoaderData();
  const [workflowView, setWorkflowView] = useState<WorkflowView>("table");
  const showWorkflowTable = useCallback(() => {
    setWorkflowView("table");
  }, []);
  const showWorkflowDiagram = useCallback(() => {
    setWorkflowView("diagram");
  }, []);
  const isDiagramFullWidth = slug === "workflows" && workflowView === "diagram";

  const content =
    slug === "" ? (
      <Overview />
    ) : slug === "workflows" ? (
      <>
        <WorkflowViewToggle
          onDiagram={showWorkflowDiagram}
          onTable={showWorkflowTable}
          view={workflowView}
        />
        {TABLES.workflows.render(refData)}
      </>
    ) : (
      TABLES[slug].render(refData)
    );

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
              params={DOCS_LINK_PARAMS}
              to="/docs/$"
            >
              Docs
            </Link>
            <Link
              className="font-medium text-fd-foreground"
              params={REF_OVERVIEW_PARAMS}
              to="/ref/$"
            >
              Reference
            </Link>
          </nav>
        </div>
      </header>

      <div
        className={
          isDiagramFullWidth ? "mx-auto max-w-none px-4 py-6" : "mx-auto max-w-6xl px-4 py-6"
        }
      >
        {isDiagramFullWidth ? (
          <main className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <WorkflowViewToggle
                onDiagram={showWorkflowDiagram}
                onTable={showWorkflowTable}
                view={workflowView}
              />
              <p className="text-sm text-fd-muted-foreground">
                {refData.workflows.length} workflows across {refData.modules.length} modules. Pick a
                module to explore its hierarchy.
              </p>
            </div>
            <WorkflowDiagram workflows={refData.workflows} />
          </main>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row">
            <aside className="w-full shrink-0 md:w-56">
              <nav
                aria-label="Reference sections"
                className="flex flex-row flex-wrap gap-1 md:flex-col"
              >
                {TABS.map((tab) => {
                  const isActive = tab.slug === slug;
                  const count = "count" in tab ? tab.count(refData) : null;
                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      key={tab.slug}
                      className={
                        isActive
                          ? "flex items-center justify-between gap-2 rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground"
                          : "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
                      }
                      // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- TanStack Router requires a per-tab params object; each tab needs its own _splat value.
                      params={{ _splat: tab.slug }}
                      to="/ref/$"
                    >
                      <span>{tab.label}</span>
                      {count !== null ? (
                        <span
                          className={
                            isActive
                              ? "rounded-full bg-fd-primary-foreground/20 px-2 py-0.5 text-xs tabular-nums"
                              : "rounded-full bg-fd-muted px-2 py-0.5 text-xs tabular-nums"
                          }
                        >
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-4 text-sm text-fd-muted-foreground">
                {refData.modules.length} modules, {refData.schemas.length} schemas,{" "}
                {refData.dbSchemas.length} db schemas, {refData.workflows.length} workflows,{" "}
                {refData.workflowSteps.length} steps, {refData.events.length} events.
                <span className="ml-2">
                  Source: generated at build time via <code>scripts/generate-ref.ts</code>
                </span>
              </div>

              {content}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowViewToggle({
  onDiagram,
  onTable,
  view,
}: {
  onDiagram: () => void;
  onTable: () => void;
  view: WorkflowView;
}) {
  return (
    <div
      aria-label="Workflows view"
      className="mb-4 inline-flex rounded-md border p-1"
      role="tablist"
    >
      <button
        aria-selected={view === "table"}
        className={
          view === "table"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onTable}
        role="tab"
        type="button"
      >
        Table View
      </button>
      <button
        aria-selected={view === "diagram"}
        className={
          view === "diagram"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onDiagram}
        role="tab"
        type="button"
      >
        Diagram View
      </button>
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
            {/* oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- TanStack Router requires a per-tab params object; each tab needs its own _splat value. */}
            <Link className="underline" params={{ _splat: tab.slug }} to="/ref/$">
              {tab.label}
            </Link>{" "}
            — {tab.blurb(refData)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-fd-muted-foreground">
        Endpoint: <code>{`${REF_ROUTE}/*`}</code>. Each table row is anchored (e.g.{" "}
        <code>{REF_ROUTE}/workflows#task.create</code>). Data source is generated at build time
        (gitignored, verified with <code>bun run gen:ref --check</code>).
      </p>
    </div>
  );
}
