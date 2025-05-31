const express = require("express");
const cors = require("cors"); // <- add this

const app = express();
const port = 3000;

app.use(cors()); // <- allow all origins

app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

