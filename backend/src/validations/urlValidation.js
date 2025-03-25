// urlValidation.js

import { body, query } from "express-validator";

export const validateShortenURL = [
  body("originalURL")
    .notEmpty()
    .withMessage("Your original URL is required")
    .isURL()
    .withMessage("Invalid URL")
    .isLength({ max: 1000 })
    .withMessage("Your origial URL must not exceed 1000 characters"),
  body("userID").optional().isString().withMessage("userID must be a string"),
];

export const validateGetOriginalURL = [
  query("shortURL")
    .notEmpty()
    .withMessage("shortURL is required")
    .isURL()
    .withMessage("shortURL must be a valid URL"),
];
