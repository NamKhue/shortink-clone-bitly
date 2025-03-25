// src/controllers/urlController.js

import { validationResult } from "express-validator";

import { logger } from "#utils/logger";
import { shortenURL, getOriginalURL } from "#services/urlService";
import {
  validateShortenURL,
  validateGetOriginalURL,
} from "#validations/urlValidation";

export function shortenURLController() {
  return [
    validateShortenURL,
    async (req, res) => {
      logger.info("Received request to shortenURL:", req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.info("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { originalURL, userID } = req.body;
        logger.info("Calling shortenURL with:", { originalURL, userID });

        // get pool from req.pool
        const pool = req.pool;
        const shortURL = await shortenURL(pool, originalURL, userID);
        logger.info("Shortened URL:", shortURL);

        res.status(200).json({ shortURL });
      } catch (err) {
        logger.error("Error in shortenURLController:", err);
        res.status(500).json({ error: err.message });
      }
    },
  ];
}

export function getOriginalURLController() {
  return [
    validateGetOriginalURL,
    async (req, res) => {
      logger.info("Received request to getOriginalURL:", req.query);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        // get pool from req.pool
        const pool = req.pool;

        const { shortURL } = req.query;
        const result = await getOriginalURL(pool, shortURL);

        if (result.found) {
          res.status(200).json({ originalURL: result.originalURL });
        } else {
          res.status(404).json({ error: "Short URL not found" });
        }
      } catch (err) {
        logger.error("Error in getOriginalURLController:", err);
        res.status(500).json({ error: err.message });
      }
    },
  ];
}
