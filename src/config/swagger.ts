import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Royal Clans API",
      version: "1.0.0",
      description:
        "REST API for Royal Clans — the Free Fire / Blood Strike esports tournament marketplace (auth, wallet, tournaments, matches, and more).",
    },
    servers: [
      { url: `http://localhost:${env.port}/api/v1`, description: "Local dev" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.route.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
