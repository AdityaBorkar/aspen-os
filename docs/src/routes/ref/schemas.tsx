import { DataTable, SCHEMA_COLUMNS } from "#/components/ref-tables";
import { getSchemaAnchor, getSchemaKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/schemas")({
  component: RefSchemasPage,
});

function RefSchemasPage() {
  return (
    <DocsPage>
      <DocsTitle>Schemas</DocsTitle>
      <DocsDescription>
        {REF_DATA.schemas.length} Valibot schemas from packages/*/src/schemas/**/*.ts
      </DocsDescription>
      <DocsBody>
        <DataTable
          columns={SCHEMA_COLUMNS}
          getAnchor={getSchemaAnchor}
          getKey={getSchemaKey}
          rows={REF_DATA.schemas}
        />
      </DocsBody>
    </DocsPage>
  );
}
