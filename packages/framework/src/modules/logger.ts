import { context, trace } from "@opentelemetry/api";
import pino from "pino";
import pretty from "pino-pretty";

const isDev = ["development", "dev"].includes(
  process.env.NODE_ENV || "development",
);

export const logger = pino(
  {
    base: {
      env: process.env.NODE_ENV || "development",
      service: process.env.OTEL_SERVICE_NAME || "alpauls-ats",
    },
    level: process.env.LOG_LEVEL || "info",
    mixin() {
      const span = trace.getSpan(context.active());
      if (!span) return {};
      const { traceId, spanId } = span.spanContext();
      return { span_id: spanId, trace_id: traceId };
    },
  },
  isDev
    ? pretty({
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:HH:MM:ss",
      })
    : undefined,
);
