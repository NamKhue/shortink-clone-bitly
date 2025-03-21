const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const urlRoutes = require("./routes/urlRoutes");

const app = express();
const PORT = 5000;

// middleware helmet
app.use(helmet());

app.use(
  cors({
    // frontend's port
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", urlRoutes);

app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
