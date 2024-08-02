const express = require("express");
const cors = require("cors");

const app = express();
const port = 3002;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
