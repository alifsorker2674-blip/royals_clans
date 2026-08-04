import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

async function start(): Promise<void> {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
    console.log(`API docs available at http://localhost:${env.port}/api-docs`);
  });
}

start();
