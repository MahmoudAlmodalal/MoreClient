import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Accept Twilio's form-urlencoded webhook payloads.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Webhooks live at the root so external services don't need /api prefix.
app.use(webhooksRouter);
app.use("/api", router);

// Global error handler keeps RFC 7807-ish shape the clients expect.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ detail: err.message || "Internal server error" });
});

export default app;
