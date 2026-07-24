import express, { Application } from "express";
import cors from "cors";
import healthRoute from "./routes/health.route";

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoute);

export default app;
