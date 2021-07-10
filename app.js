import express from "express";
import mustache from "mustache-express";
import { app, router, server } from "./routes/index.js";
import cors from "cors";
import path from "path";
import compression from "compression";

// Constante
const dirname = path.resolve();

// Config
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
