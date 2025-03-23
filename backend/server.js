const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { allowedOrigins } = require("./config/cors");
const urlRoutes = require("./routes/urlRoutes");

const app = express();
const PORT = 5000;

// middleware helmet
app.use(helmet());

// config CORS
app.use(
  cors({
    // allow requests dont have origin (postman) or valid origin
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", urlRoutes);

app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
