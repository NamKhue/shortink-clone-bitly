const pool = require("../config/database");
const { createShortHash } = require("../utils/hashUtils");

async function shortenURL(originalURL, userID, domain = "https://short.ly/") {
  let shortURL;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    shortURL = createShortHash(originalURL, userID, domain);
    try {
      const query = "INSERT INTO urls (short_url, original_url) VALUES (?, ?)";
      await pool.execute(query, [shortURL, originalURL]);
      console.log(`Saved to database: ${shortURL} -> ${originalURL}`);
      return shortURL;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error(
            "Failed to generate unique short URL after maximum attempts"
          );
        }
      } else {
        throw err;
      }
    }
  }
}

async function getOriginalURL(shortURL) {
  try {
    const query = "SELECT original_url FROM urls WHERE short_url = ?";
    const [results] = await pool.execute(query, [shortURL]);
    if (results.length > 0) {
      return { found: true, originalURL: results[0].original_url };
    }
    return { found: false, originalURL: "" };
  } catch (err) {
    console.error("Error querying database:", err);
    throw err;
  }
}

module.exports = { shortenURL, getOriginalURL };
