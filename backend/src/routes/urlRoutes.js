// src/routes/urlRoutes.js

import express from "express";

import {
  shortenURLController,
  getOriginalURLController,
} from "#controllers/urlController";

export default function createUrlRoutes() {
  const router = express.Router();

  router.post("/shorten", shortenURLController());
  router.get("/redirect", getOriginalURLController());

  return router;
}
