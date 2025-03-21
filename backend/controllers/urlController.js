const { validationResult } = require("express-validator");
const { shortenURL, getOriginalURL } = require("../services/urlService");
const {
  validateShortenURL,
  validateGetOriginalURL,
} = require("../validation/urlValidation");

const shortenURLController = [
  validateShortenURL,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { originalURL, userID } = req.body;
      const shortURL = await shortenURL(originalURL, userID);
      res.status(200).json({ shortURL });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
];

const getOriginalURLController = [
  validateGetOriginalURL,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { shortURL } = req.query;
      const result = await getOriginalURL(shortURL);
      if (result.found) {
        res.status(200).json({ originalURL: result.originalURL });
      } else {
        res.status(404).json({ error: "Short URL not found" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
];

module.exports = { shortenURLController, getOriginalURLController };
