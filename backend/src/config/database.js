// src/config/database.js

import mysql from "mysql2/promise";
import { config } from "dotenv-safe";
import { EventEmitter } from "events";

import { logger } from "#utils/logger";

config();

// create EventEmitter to manage events of database
const dbEvents = new EventEmitter();
let pool;
let isReconnecting = false;

// function to create private pool for reuse
function createDatabasePool() {
  const caPem = process.env.MYSQL_CA_PEM;
  if (!caPem) {
    logger.error("MYSQL_CA_PEM environment variable is not set");
    throw new Error("MYSQL_CA_PEM environment variable is not set");
  }

  return mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_NAME || "shortink_db",
    port: process.env.MYSQL_PORT || "3306",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 100,
    connectTimeout: 10000, // maximum timeout for connecting
    queryTimeout: 10000, // maximum timeout 10 seconds for each query
    ssl: {
      ca: caPem,

      // ensure certificate authentication
      rejectUnauthorized: true,
    },
  });
}

export async function startDatabase({ retries = 3, delay = 2000 } = {}) {
  if (pool) {
    try {
      await pool.query("SELECT 1");
      logger.info("Existing pool is still healthy");

      return;
    } catch (err) {
      logger.warn("Existing pool is unhealthy, reinitializing...");

      // ignore errors if pool has failed
      await pool.end().catch(() => {});
      pool = null;
    }
  }

  logger.info("Starting pool initialization...");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = createDatabasePool();

      // check connection
      await pool.query("SELECT 1");
      logger.info(
        `Database pool started successfully after ${attempt} attempt(s)`
      );

      // check INSERT permissions on table `urls`
      const testShortCode = "test_" + Date.now();
      const testOriginalUrl = "http://example-url.com";
      await pool.execute(
        "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
        [testShortCode, testOriginalUrl]
      );
      await pool.execute("DELETE FROM urls WHERE short_code = ?", [
        testShortCode,
      ]);
      logger.info(
        "Database permissions verified: INSERT and DELETE successful"
      );

      // setup listener to detect pool errors
      setupPoolErrorListener();

      return;
    } catch (err) {
      logger.error(`Attempt ${attempt} failed to start database pool:`, err);

      if (attempt === retries) {
        throw new Error(
          `Failed to start database pool after ${retries} attempts`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function stopDatabase({ timeoutMs = 5000 } = {}) {
  if (!pool) {
    logger.info("There is no database pool to stop");
    return;
  }

  // wait for completing active database queries with timeout
  const waitForConnections = (timeoutMs) => {
    return new Promise((resolve, reject) => {
      if (!pool._allConnections || pool._allConnections.length === 0) {
        logger.info("No active connections, proceeding to close pool...");
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (!pool || !pool._allConnections) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
          return;
        }

        const activeConnections =
          pool._allConnections.length - pool._freeConnections.length;

        logger.info(`Active connections: ${activeConnections}`);

        if (activeConnections === 0) {
          const elapsedTime = Date.now() - startTime;

          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        const elapsedTime = Date.now() - startTime;

        reject(
          new Error(
            `Timeout waiting for active connections to complete after ${elapsedTime}ms`
          )
        );
      }, timeoutMs);
    });
  };

  logger.info("Waiting for active database queries to complete...");

  try {
    // wait up to 5 seconds
    await waitForConnections(timeoutMs);
  } catch (err) {
    logger.warn("Warning:", err.message);

    // check and rollback transactions on active connections
    if (pool && pool._allConnections) {
      const activeConnections =
        pool._allConnections.length - pool._freeConnections.length;
      if (activeConnections > 0) {
        logger.warn(
          `Timeout reached, attempting to rollback ${activeConnections} active connections...`
        );

        const connections = pool._allConnections;
        for (const connection of connections) {
          try {
            if (!pool._freeConnections.includes(connection)) {
              await new Promise((resolve) => {
                connection.rollback(() => resolve());
              });
              logger.info(
                `Rolled back transaction on connection ${connection.threadId}`
              );
            }
          } catch (rollbackErr) {
            logger.error(
              `Failed to rollback transaction on connection ${connection.threadId}:`,
              rollbackErr
            );
          }
        }
      }

      // continue to close pool despite timeout
    }
  }

  // close pool
  if (pool) {
    await pool.end().catch((err) => logger.warn("Error closing pool:", err));
    logger.info("Database pool is stopped");
    pool = null;
  }
}

// handle reconnect action when pool has failed
async function reconnectPool({ maxRetries = 3, delay = 5000 } = {}) {
  // avoid reconnecting simultaneously
  if (isReconnecting) return;

  isReconnecting = true;

  logger.info("Attempting to reconnect to database pool...");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // close old pool if it still exists
      if (pool) {
        // ignore errors if pool has failed
        await pool.end().catch(() => {});

        pool = null;
      }

      // try re-initializing the pool
      pool = createDatabasePool();

      await pool.query("SELECT 1");
      logger.info(
        `Reconnected to database pool successfully after ${attempt} attempt(s)`
      );

      // re-setup listener after reconnecting
      setupPoolErrorListener();

      isReconnecting = false;

      return;
    } catch (err) {
      logger.error(`Reconnect attempt ${attempt} failed:`, err);

      if (attempt === maxRetries) {
        logger.error(
          `Failed to reconnect after ${maxRetries} attempts. Shutting down...`
        );

        // send critical error signal
        dbEvents.emit("poolFatalError", err);

        isReconnecting = false;

        // shutdown the application
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// pool error listener
function setupPoolErrorListener() {
  pool.on("error", async (err) => {
    logger.error("Database pool error:", err);

    if (["PROTOCOL_CONNECTION_LOST", "ECONNREFUSED"].includes(err.code)) {
      // send error signal
      dbEvents.emit("poolError", err);

      // active reconnect action when connection is lost
      await reconnectPool();
    } else {
      // send fatal error signal
      dbEvents.emit("poolFatalError", err);
    }
  });
}

//
export function getPool() {
  if (!pool) {
    throw new Error("Database pool not started. Call startDatabase first.");
  }
  return pool;
}

//
export { dbEvents };
