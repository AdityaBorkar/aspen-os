import { echo } from "#/server/rpc/procedures/echo";
import { healthCheck } from "#/server/rpc/procedures/health-check";

export type RpcRouter = typeof router;

export const router = {
  echo,
  health: {
    check: healthCheck,
  },
};
