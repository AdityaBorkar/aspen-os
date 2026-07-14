import { HomeLayout } from "fumadocs-ui/layouts/home";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";

import { LAYOUT_BASE_OPTIONS } from "@/lib/constants";

export function NotFound() {
  return (
    <HomeLayout {...LAYOUT_BASE_OPTIONS}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
