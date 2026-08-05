import { createFileRoute } from "@tanstack/react-router";

import { p } from "@/aspen/server";

// Demonstrates the module-class API: all mutations go through the owning
// module's workflows, accessed via the platform proxy inside p.run().
// e.g. POST /api/tasks
export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          description?: string;
          projectId: string;
          reporterId: string;
          statusId: string;
          title: string;
        };

        return p.run(async () => {
          const task = await p.tasks.tasks.create.run({
            description: body.description ?? null,
            projectId: body.projectId,
            reporterId: body.reporterId,
            statusId: body.statusId,
            title: body.title,
          });
          return Response.json({ task });
        });
      },
    },
  },
});
