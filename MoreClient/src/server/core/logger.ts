import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;

function buildTransport() {
  if (isDev) {
    return { target: "pino-pretty", options: { colorize: true } };
  }

  if (axiomToken && axiomDataset) {
    // @axiomhq/js pino transport — installed with @axiomhq/js package
    return {
      targets: [
        {
          target: "@axiomhq/js/pino",
          options: { dataset: axiomDataset, token: axiomToken },
          level: "info",
        },
        { target: "pino/file", options: { destination: 1 }, level: "info" },
      ],
    };
  }

  return undefined;
}

export const logger = pino({
  level: isDev ? "debug" : "info",
  base: { service: "moreclient-web" },
  transport: buildTransport(),
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.secret",
      "*.creditCard",
      "*.ssn",
      "*.apiKey",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});

export type Logger = typeof logger;

/** Create a child logger scoped to a request. */
export function requestLogger(requestId: string, extra?: Record<string, unknown>) {
  return logger.child({ requestId, ...extra });
}
