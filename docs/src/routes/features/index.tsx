import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/features/")({
  component: FeaturesIndex,
  loader: () => {
    throw redirect({ params: { moduleName: "platform" }, to: "/features/$moduleName" });
  },
});

function FeaturesIndex() {
  return null;
}
