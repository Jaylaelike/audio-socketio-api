import path from "path";
import express from "express";

import { Server } from "socket.io";

const app = express();

const WS_PORT = process.env.WS_PORT || 8888;
const HTTP_PORT = process.env.HTTP_PORT || 8000;

const wsServer = new Server(WS_PORT, {
  cors: {
    origin: "*",
  },
});


// array of connected websocket clients
let connectedClients = [];

wsServer.on("connection", (ws, req) => {
  console.log("Connected");

  let messager = req;
  //console.log(messager);

  if (messager == "/Reccord/") {
    console.log("Hi.. Reccord");
    console.log(messager);
    //audioRecorder.start()
  }

  if (messager == "/Stop/") {
    console.log("Hi..Stop");
    console.log(messager);
    //audioRecorder.stop()
  }

  connectedClients.push(ws);
  // listen for messages from the streamer, the clients will not send anything so we don't need to filter

  ws.on("message", (data) => {
    // console.log(data);

    connectedClients.forEach((ws, i) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
        // console.log(samples);
      } else {
        connectedClients.splice(i, 1);
      }
    });
  });
});

app.use("/image", express.static("image"));
app.use("/js", express.static("js"));
app.use("/dist", express.static("js"));

app.get("/audio", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./audio_client.html"))
);
app.get("/audio2", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./audio_client2.html"))
);
app.get("/js/worker.js", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./js/worker.js"))
);

app.get("/demo", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./demo.html"))
);
app.get("/record", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./reccord.html"))
);

app.get("/dist/wsaudio.js", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./dist/wsaudio.js"))
);
app.get("/dist/worker.js", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./dist/worker.js"))
);
app.get("/tsconfig.json", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./tsconfig.json"))
);

app.get("/index", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./index.html"))
);
app.get("/style.css", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./simple_recorderjs/style.css"))
);
app.get("/js/recorder.js", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./js/recorder.js"))
);
app.get("/js/app.js", (_, res) =>
  res.sendFile(path.resolve(__dirname, "./js/app.js"))
);

app.listen(HTTP_PORT, () =>
  console.log(`HTTP server listening at http://localhost:${HTTP_PORT}`)
);


