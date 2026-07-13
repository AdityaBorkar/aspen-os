import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { LAYOUT_BASE_OPTIONS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...LAYOUT_BASE_OPTIONS}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-bold text-4xl">Aspen OS</h1>
          <p className="text-fd-muted-foreground text-lg">
            A business framework with pluggable units and modules.
          </p>
        </div>
        <Link
          className="rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground text-sm"
          params={{
            _splat: "framework",
          }}
          to="/docs/$"
        >
          Read the Docs
        </Link>
      </div>
    </HomeLayout>
  );
}
