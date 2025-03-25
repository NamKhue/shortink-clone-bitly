// src/services/urlService.js

import { createShortHash } from "#utils/hashUtils";
import { logger } from "#utils/logger";

export async function shortenURL(
  pool,
  originalUrl,
  userID,
  domain = process.env.MAIN_DOMAIN
) {
  logger.info("Starting shortenURL:", { originalUrl, userID });

  const shortCode = createShortHash(originalUrl, userID);
  const shortUrl = `${domain}/${shortCode}`;

  // save into database asynchronous background
  const saveToDatabase = async () => {
    // retry maximum 5 times to save shortCode into DB if occur errors
    const maxRetries = 5;

    // setup baseDelay with 500ms
    const baseDelay = 500;

    // List of fixed bugs that should not be retried
    const permanentErrors = [
      "ER_PARSE_ERROR", // incorrect SQL syntax
      "ER_ACCESS_DENIED_ERROR", // access denied for user
      "ER_NO_SUCH_TABLE", // table does not exist
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `Attempt ${attempt} to save into DB with shortCode: ${shortCode}`
        );

        await pool.execute(
          "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
          [shortCode, originalUrl]
        );

        logger.info(
          `Saved to database: {
            short_code: ${shortCode},
            original_url: ${originalUrl},
            user_id: ${userID}
        }`
        );

        // exit the loop if successful
        return;
      } catch (err) {
        logger.error(`Attempt ${attempt} failed to save ${shortUrl}:`, err);

        // stop retrying if the error is fixed
        if (permanentErrors.includes(err.code)) {
          logger.error(
            `Permanent error (${err.code}) for ${shortUrl}, stopping retries`
          );
          return;
        }

        // exit loop of saving into DB after the last attempt
        if (attempt === maxRetries) {
          logger.error(
            `Failed to save ${shortUrl} after ${maxRetries} attempts`
          );

          // not throw any error to still return shortUrl to the client
          return;
        }

        //
        // exponential backoff with jitter - no retry for fixed bugs, avoid wasting resources
        // exponential backoff allows the database have more time to recover on subsequent attempts
        //
        // baseDelay = 500: start with 500ms - reduced wait time if errors are resolved quickly
        // delay = baseDelay * Math.pow(2, attempt - 1): exponentially increasing latency/tăng độ trễ theo cấp số nhân:
        // attempt 1: 500ms
        // attempt 2: 1000ms
        // attempt 3: 2000ms
        // attempt 4: 4000ms
        // maximum total waiting time = 500 + 1000 + 2000 + 4000 = 7500ms (7.5 seconds)
        //

        // example: 500ms, 1000ms, 2000ms, 4000ms
        const delay = baseDelay * Math.pow(2, attempt - 1);

        // jitter: 0-200ms - jiter helps avoid concurrent retries if multiple requests are retrying, and reduce pressure on database
        const jitter = Math.random() * 200;

        const totalDelay = delay + jitter;

        logger.info(`Waiting ${totalDelay}ms before retrying...`);

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
  };

  // background task to save into db - asynchronous, not using await
  saveToDatabase().catch((err) => {
    logger.error("Unexpected error in background saveToDatabase:", err);
  });

  return shortUrl;
}

export async function getOriginalURL(pool, shortUrl) {
  try {
    const query = "SELECT original_url FROM urls WHERE short_code = ?";

    const url = new URL(shortUrl);
    const shortCode = url.pathname.slice(1);

    const [results] = await pool.execute(query, [shortCode]);
    if (results.length > 0) {
      return { found: true, originalURL: results[0].original_url };
    }

    return { found: false, originalURL: "" };
  } catch (err) {
    logger.error("Error querying database:", err);
    throw err;
  }
}
