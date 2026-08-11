import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";

const app = express();

const allowedOrigins = [
  env.frontendUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://localhost:4173"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
