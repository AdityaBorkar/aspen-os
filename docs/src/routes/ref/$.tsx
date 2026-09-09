import { GIT_CONFIG, REF_ROUTE } from "#/lib/constants";
import refData from "#/lib/generated/ref.json";

import { createFileRoute, Link, notFound } from "@tanstack/react-router";

type RefData = typeof refData;

const TABS = [
  { label: "Overview", slug: "" },
  { label: "Modules", slug: "modules" },
  { label: "Schemas", slug: "schemas" },
  { label: "DB Schemas", slug: "db-schemas" },
  { label: "Workflows", slug: "workflows" },
  { label: "Workflow Steps", slug: "workflow-steps" },
  { label: "Events", slug: "events" },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];

const VALID_SLUGS = new Set<string>(TABS.map((entry) => entry.slug));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function githubUrl(file: string): string {
  return `https://github.com/${GIT_CONFIG.user}/${GIT_CONFIG.repo}/blob/${GIT_CONFIG.branch}/${file}`;
}

export const Route = createFileRoute("/ref/$")({
  component: RefPage,
  loader: ({ params }) => {
    const splat = params._splat ?? ""; // oxlint-disable-line no-underscore-dangle
    const slug = splat.replaceAll(/^\/|\/$/g, "");
    if (!VALID_SLUGS.has(slug)) {
      throw notFound();
    }
    // SAFETY: slug is validated against VALID_SLUGS which is derived from TABS slugs, so it is a valid TabSlug.
    return { slug: slug as TabSlug };
  },
});

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
          Generated at {new Date(refData.generatedAt).toLocaleString()} — {refData.modules.length}{" "}
          modules, {refData.schemas.length} schemas, {refData.dbSchemas.length} db schemas,{" "}
          {refData.workflows.length} workflows, {refData.workflowSteps.length} steps,{" "}
          {refData.events.length} events.
          <span className="ml-2">
            Source: <code>docs/.generated/ref.json</code> via <code>scripts/generate-ref.ts</code>
          </span>
        </div>

        {slug === "" ? <Overview /> : null}
        {slug === "modules" ? <ModulesTable data={refData} /> : null}
        {slug === "schemas" ? <SchemasTable data={refData} /> : null}
        {slug === "db-schemas" ? <DbSchemasTable data={refData} /> : null}
        {slug === "workflows" ? <WorkflowsTable data={refData} /> : null}
        {slug === "workflow-steps" ? <WorkflowStepsTable data={refData} /> : null}
        {slug === "events" ? <EventsTable data={refData} /> : null}
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
        {TABS.filter((entry) => entry.slug !== "").map((tab) => (
          <li key={tab.slug}>
            <Link className="underline" params={{ _splat: tab.slug }} to="/ref/$">
              {tab.label}
            </Link>{" "}
            — {describeTab(tab.slug)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-fd-muted-foreground">
        Endpoint: <code>{REF_ROUTE}/*</code>. Each table row is anchored (e.g.{" "}
        <code>{REF_ROUTE}/workflows#task.create</code>). Data source is{" "}
        <code>docs/.generated/ref.json</code> (committed, verified with{" "}
        <code>bun run gen:ref --check</code>).
      </p>
    </div>
  );
}

function describeTab(slug: string): string {
  switch (slug) {
    case "modules": {
      return `${refData.modules.length} modules from packages/*/src/module.ts`;
    }
    case "schemas": {
      return `${refData.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts`;
    }
    case "db-schemas": {
      return `${refData.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts`;
    }
    case "workflows": {
      return `${refData.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts`;
    }
    case "workflow-steps": {
      return `${refData.workflowSteps.length} WorkflowStep.name(...) from packages/*/src/workflow-steps/**/*.ts`;
    }
    case "events": {
      return `${refData.events.length} topics from packages/*/src/pubsub.ts`;
    }
    default: {
      return "";
    }
  }
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border">{children}</div>;
}

function ModulesTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Module ($name)</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Dependencies</th>
            <th className="px-3 py-2">Consumes</th>
          </tr>
        </thead>
        <tbody>
          {data.modules.map((mod) => (
            <tr key={`${mod.package}:${mod.name}`} className="border-t" id={slugify(mod.name)}>
              <td className="px-3 py-2 font-mono">
                <a className="underline decoration-dotted" href={`#${slugify(mod.name)}`}>
                  {mod.name}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{mod.package}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(mod.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {mod.file}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {mod.dependencies.length > 0 ? mod.dependencies.join(", ") : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {mod.consumes.length > 0 ? mod.consumes.join(", ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function SchemasTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Schema</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.schemas.map((schemaEntry) => (
            <tr
              key={`${schemaEntry.package}:${schemaEntry.name}:${schemaEntry.file}`}
              className="border-t"
              id={slugify(`${schemaEntry.package}-${schemaEntry.name}`)}
            >
              <td className="px-3 py-2 font-mono">
                <a
                  className="underline decoration-dotted"
                  href={`#${slugify(`${schemaEntry.package}-${schemaEntry.name}`)}`}
                >
                  {schemaEntry.name}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{schemaEntry.package}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(schemaEntry.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {schemaEntry.file}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function DbSchemasTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Table / Enum</th>
            <th className="px-3 py-2">Variable</th>
            <th className="px-3 py-2">Kind</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.dbSchemas.map((dbSchema) => (
            <tr
              key={`${dbSchema.package}:${dbSchema.tableName}:${dbSchema.name}`}
              className="border-t"
              id={slugify(dbSchema.tableName)}
            >
              <td className="px-3 py-2 font-mono">
                <a className="underline decoration-dotted" href={`#${slugify(dbSchema.tableName)}`}>
                  {dbSchema.tableName}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{dbSchema.name}</td>
              <td className="px-3 py-2 text-xs">{dbSchema.kind}</td>
              <td className="px-3 py-2 font-mono text-xs">{dbSchema.package}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(dbSchema.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {dbSchema.file}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function WorkflowsTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Workflow</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">Export</th>
            <th className="px-3 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.workflows.map((workflow) => (
            <tr
              key={`${workflow.package}:${workflow.name}:${workflow.file}`}
              className="border-t"
              id={slugify(workflow.name)}
            >
              <td className="px-3 py-2 font-mono">
                <a className="underline decoration-dotted" href={`#${slugify(workflow.name)}`}>
                  {workflow.name}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{workflow.package}</td>
              <td className="px-3 py-2 font-mono text-xs">{workflow.exportName ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(workflow.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {workflow.file}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function WorkflowStepsTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Step</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">Export</th>
            <th className="px-3 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.workflowSteps.map((step) => (
            <tr
              key={`${step.package}:${step.name}:${step.file}`}
              className="border-t"
              id={slugify(step.name)}
            >
              <td className="px-3 py-2 font-mono">
                <a className="underline decoration-dotted" href={`#${slugify(step.name)}`}>
                  {step.name}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{step.package}</td>
              <td className="px-3 py-2 font-mono text-xs">{step.exportName ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(step.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {step.file}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function EventsTable({ data }: { data: RefData }) {
  return (
    <TableWrapper>
      <table className="w-full text-sm">
        <thead className="bg-fd-muted/50 text-left">
          <tr>
            <th className="px-3 py-2">Topic</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">Constant</th>
            <th className="px-3 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((eventEntry) => (
            <tr
              key={`${eventEntry.package}:${eventEntry.topic}`}
              className="border-t"
              id={slugify(eventEntry.topic)}
            >
              <td className="px-3 py-2 font-mono">
                <a className="underline decoration-dotted" href={`#${slugify(eventEntry.topic)}`}>
                  {eventEntry.topic}
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{eventEntry.package}</td>
              <td className="px-3 py-2 font-mono text-xs">{eventEntry.constant}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <a
                  className="underline"
                  href={githubUrl(eventEntry.file)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {eventEntry.file}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}
