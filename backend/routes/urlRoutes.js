const express = require("express");
const {
  shortenURLController,
  getOriginalURLController,
} = require("../controllers/urlController");

const router = express.Router();

router.post("/shorten", shortenURLController);
router.get("/redirect", getOriginalURLController);

module.exports = router;
