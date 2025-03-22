const { body, query } = require("express-validator");

const validateShortenURL = [
  body("originalURL")
    .notEmpty()
    .withMessage("Your original URL is required")
    .isURL()
    .withMessage("Invalid URL")
    .isLength({ max: 1000 })
    .withMessage("Your origial URL must not exceed 1000 characters"),
  body("userID").optional().isString().withMessage("userID must be a string"),
];

const validateGetOriginalURL = [
  query("shortURL")
    .notEmpty()
    .withMessage("shortURL is required")
    .isURL()
    .withMessage("shortURL must be a valid URL"),
];

module.exports = { validateShortenURL, validateGetOriginalURL };
