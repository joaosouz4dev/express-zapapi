import express from "express";
import mustache from "mustache-express";
import { app, router, server } from "./routes/index.js";
import cors from "cors";
import path from "path";
import compression from "compression";
import RateLimit from "express-rate-limit";

// set up rate limiter: maximum of five requests per minute
const limiter = new RateLimit({
  windowMs: 1*60*1000, // 1 minute
  max: 60
});

// Constante
const dirname = path.resolve();

// Config
app.use(limiter); // apply rate limiter to all requests
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(compression());
app.use("/upload", express.static(path.join(dirname, "upload")));
app.use("/upload/enviar", express.static(path.join(dirname, "upload/enviar")));

// Rotas
app.use("/", router);
app.use((req, res) => {
  res
    .status(404)
    .type("txt")
    .send("404, rota não encontrada, verifique a solicitação.");
});

// Habilitando mustache para renderizar views
app.engine("mst", mustache());
app.set("view engine", "mst");
app.set("views", dirname + "/views");

export default server;
