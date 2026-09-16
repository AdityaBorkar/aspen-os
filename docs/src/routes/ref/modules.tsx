import { DataTable, MODULE_COLUMNS } from "#/components/ref-tables";
import { getModuleAnchor, getModuleKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/modules")({
  component: RefModulesPage,
});

function RefModulesPage() {
  return (
    <DocsPage>
      <DocsTitle>Modules</DocsTitle>
      <DocsDescription>
        {REF_DATA.modules.length} modules from packages/*/src/module.ts
      </DocsDescription>
      <DocsBody>
        <DataTable
          columns={MODULE_COLUMNS}
          getAnchor={getModuleAnchor}
          getKey={getModuleKey}
          rows={REF_DATA.modules}
        />
      </DocsBody>
    </DocsPage>
  );
}
