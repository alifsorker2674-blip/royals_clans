import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import router from "./routes";
import { UPLOAD_DIR } from "./routes/upload.route";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

const app: Application = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.clientUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Uploaded screenshots — served as plain static files (see routes/upload.route.ts).
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api/v1", router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
