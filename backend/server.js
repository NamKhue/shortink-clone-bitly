// server.js

import { configureApp } from "#config/appConfig";
import { startDatabase, stopDatabase, getPool } from "#config/database";
import { logger } from "#utils/logger";
import { setShuttingDown, getShuttingDown } from "#utils/serverState";

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 15000;
const CLOSING_SERVER_TIMEOUT = process.env.CLOSING_SERVER_TIMEOUT || 5000;
const CLOSING_POOL_TIMEOUT = process.env.CLOSING_POOL_TIMEOUT || 10000;

(async () => {
  try {
    // check status of server before starting
    if (getShuttingDown()) {
      logger.error(
        "Server is currently shutting down, cannot start a new instance."
      );
      process.exit(1);
    }

    // initialize database pool with retry
    await startDatabase({ retries: 5, delay: 2000 });

    const pool = getPool();

    // configure Express application with pool
    const app = configureApp(pool);

    const server = app.listen(PORT, () => {
      logger.info(`Backend is running on port ${PORT}\n`);
    });

    // graceful shutdown
    const gracefulShutdown = async (signal) => {
      // prevent gracefulShutdown from running again
      if (getShuttingDown()) {
        logger.info(`Already shutting down, ignoring ${signal}`);
        return;
      }

      // flag for action reject new requests immediately
      // update state of shuttingDown be true - meaning that server is in graceful shutdown progress
      setShuttingDown(true);

      logger.info(`Received ${signal}. Shutting down gracefully...`);

      // timeout for the entire shutdown process
      const shutdownTimeout = setTimeout(() => {
        logger.error("Shutdown timed out. Forcing exit...");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      try {
        // close server before closing pool
        await new Promise((resolve, reject) => {
          // server is already closed
          if (!server.listening) return resolve();

          // // ignore fatal errors
          // server.close((err) => resolve());

          const serverTimeout = setTimeout(() => {
            logger.warn("Server close timed out, forcing close...");
            resolve();
          }, CLOSING_SERVER_TIMEOUT);

          server.close((err) => {
            clearTimeout(serverTimeout);
            resolve();
          });
        });
        logger.info("Server closed successfully");

        // close pool and wait for completing query(s) before closing pool
        await stopDatabase({ timeoutMs: CLOSING_POOL_TIMEOUT });
        logger.info("Database pool closed successfully");

        clearTimeout(shutdownTimeout);
        logger.info("Server is stopped");

        process.exit(0);
        // process.kill(process.pid, "SIGTERM");
      } catch (err) {
        if (err.code === "ERR_SERVER_NOT_RUNNING") {
          logger.warn("Server is already closed, continuing shutdown...");
        } else {
          logger.error("Error during shutdown:", err);
          process.exit(1);
        }

        clearTimeout(shutdownTimeout);
      }
    };

    // receive signal that stop application
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception:", err);
      gracefulShutdown("UncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UnhandledRejection");
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
})();
