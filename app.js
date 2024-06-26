import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import queue from "./queue.js";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3001;
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://informal-conventions-developmental-henderson.trycloudflare.com",
    ],
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, "./public");

app.use(express.static(outputDir));

app.get("/", function (req, res) {
  res.sendFile(path.join(outputDir, "index.html"));
});

(async () => {
  try {
    await queue.loadTracks("tracks");
    queue.play();

    io.on("connection", (socket) => {
      // Every new streamer must receive the header
      if (queue.bufferHeader) {
        socket.emit("bufferHeader", queue.bufferHeader);
      }

      socket.on("bufferHeader", (header) => {
        queue.bufferHeader = header;
        socket.broadcast.emit("bufferHeader", queue.bufferHeader);
      });

      socket.on("stream", (packet) => {
        // Only broadcast microphone if a header has been received
        if (!queue.bufferHeader) return;

        // Audio stream from host microphone
        socket.broadcast.emit("stream", packet);
        console.log("stream", queue.bufferHeader);
      });

      socket.on("control", (command) => {
        switch (command) {
          case "pause":
            queue.pause();
            break;
          case "resume":
            queue.resume();
            break;
        }
      });
    });

    // HTTP stream for music
    app.get("/stream", (req, res) => {
      try {
        const { id, client } = queue.addClient();

        res
          .set({
            "Content-Type": "audio/wav",
            "Transfer-Encoding": "chunked",
          })
          .status(200);

        client.pipe(res);

        console.log(
          `Client ${id} connected, ${queue.clients.size} total clients`
        );

        req.on("close", () => {
          queue.removeClient(id);
        });
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });

    console.log("Server is running" + PORT);

    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
export {};
