const { body, query } = require("express-validator");

const validateShortenURL = [
  body("originalURL")
    .notEmpty()
    .withMessage("originalURL is required")
    .isURL()
    .withMessage("originalURL must be a valid URL")
    .isLength({ max: 1000 })
    .withMessage("originalURL must not exceed 1000 characters"),
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
