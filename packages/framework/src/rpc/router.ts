import { echo } from "./procedures/echo";
import { healthCheck } from "./procedures/health-check";

export type RpcRouter = typeof router;

export const router = {
  echo: echo,
  health: {
    check: healthCheck,
  },
};
