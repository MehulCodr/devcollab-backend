import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./db/connectDB.js";
import { createServer } from "http";
import { initSocket } from "./socket/index.js";

const startServer = async () => {
  await connectDB();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

startServer();