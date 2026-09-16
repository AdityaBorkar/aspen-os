import { APP_NAME, LAYOUT_BASE_OPTIONS } from "#/lib/constants";
import { REF_TREE } from "#/lib/ref";
import { STAGE } from "#/lib/stage";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

export const Route = createFileRoute("/ref")({
  component: RefLayout,
});

const nav = {
  ...LAYOUT_BASE_OPTIONS.nav,
  title: (
    <>
      <img alt="" className="size-5" src={`/icon${STAGE && `.${STAGE}`}.png`} />
      {APP_NAME}
    </>
  ),
};

function RefLayout() {
  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <DocsLayout {...LAYOUT_BASE_OPTIONS} nav={nav} tree={REF_TREE}>
      <Outlet />
    </DocsLayout>
  );
}
