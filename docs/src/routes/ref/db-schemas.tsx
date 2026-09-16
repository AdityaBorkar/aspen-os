import { DataTable, DB_SCHEMA_COLUMNS } from "#/components/ref-tables";
import { getDbAnchor, getDbKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/db-schemas")({
  component: RefDbSchemasPage,
});

function RefDbSchemasPage() {
  return (
    <DocsPage>
      <DocsTitle>DB Schemas</DocsTitle>
      <DocsDescription>
        {REF_DATA.dbSchemas.length} Drizzle tables/enums from packages/*/src/db-schemas/**/*.ts
      </DocsDescription>
      <DocsBody>
        <DataTable
          columns={DB_SCHEMA_COLUMNS}
          getAnchor={getDbAnchor}
          getKey={getDbKey}
          rows={REF_DATA.dbSchemas}
        />
      </DocsBody>
    </DocsPage>
  );
}
