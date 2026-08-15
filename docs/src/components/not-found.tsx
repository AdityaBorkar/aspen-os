import { LAYOUT_BASE_OPTIONS } from "#/lib/constants";

import { HomeLayout } from "fumadocs-ui/layouts/home";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";

export function NotFound() {
  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <HomeLayout {...LAYOUT_BASE_OPTIONS}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
