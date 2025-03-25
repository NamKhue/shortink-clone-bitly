// src/config/appConfig.js

import express from "express";
import helmet from "helmet";
import cors from "cors";

import createUrlRoutes from "#routes/urlRoutes";
import { getShuttingDown } from "#utils/serverState";
import { logger } from "#utils/logger";

export function configureApp(pool) {
  const app = express();

  // middleware reject new requests when shutting down
  app.use((req, res, next) => {
    if (getShuttingDown()) {
      logger.info(
        `Request rejected due to server shutdown: ${req.method} ${req.url}`
      );

      const errorMessage =
        req.method === "GET"
          ? "Server is shutting down, please try again later"
          : "Server is shutting down, cannot process your request";

      return res.status(503).json({ error: errorMessage });
    }
    next();
  });

  // CORE middleware
  // helmet middleware
  app.use(helmet());

  // config CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : [];

  // cors middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );

  // express.json() middleware
  app.use(express.json());

  // dynamic middleware
  // required middleware: setup req.pool for routes/controllers
  // warning: This middleware must be called before any routes
  app.use((req, res, next) => {
    req.pool = pool;
    next();
  });

  // middleware: ensures req.pool is available
  app.use((req, res, next) => {
    if (!req.pool) {
      logger.error("Database pool not available in request");
      return res
        .status(500)
        .json({ error: "Internal server error: Database pool not available" });
    }
    next();
  });

  // ROUTES (must be called after all middleware)
  const urlRoutes = createUrlRoutes();
  app.use("/api", urlRoutes);

  return app;
}
