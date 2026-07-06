import { context, trace } from "@opentelemetry/api";
import pino from "pino";
import pretty from "pino-pretty";

const baseEnv = process.env.NODE_ENV;
if (!baseEnv) throw new Error("NODE_ENV is not set");

const serviceName = process.env.OTEL_SERVICE_NAME;
if (!serviceName) throw new Error("OTEL_SERVICE_NAME is not set");

export const logger = pino(
  {
    base: {
      env: baseEnv,
      service: serviceName,
    },
    level: process.env.LOG_LEVEL || "info",
    mixin() {
      const span = trace.getSpan(context.active());
      if (!span) return {};
      const { traceId, spanId } = span.spanContext();
      return { span_id: spanId, trace_id: traceId };
    },
  },
  baseEnv === "development"
    ? pretty({
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:HH:MM:ss",
      })
    : undefined,
);
