require("dotenv").config();
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "Meta Ads AI",
    status: "online",
    message: "Servidor funcionando"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Meta Ads AI iniciado na porta ${port}`);
});
