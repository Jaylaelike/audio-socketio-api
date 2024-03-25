import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import  queue  from "./queue.js";
import path from "path";
import { fileURLToPath } from "url";


const PORT = 3000;
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
    const { id, client } = queue.addClient();

    res
      .set({
        "Content-Type": "audio/mp3",
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
  });

  console.log("Server is running" + PORT );

  server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
})();


////////////

// import express from "express";
// import WebSocket from "ws";
// import http from "http";

// const app = express();
// const server = http.createServer(app);
// const PORT = 3000;

// // Connect to the WebSocket server
// const ws = new WebSocket("ws://10.8.0.102:8888");

// ws.on("open", function open() {
//   console.log("connected to ws://10.8.0.102:8888");
// });

// // HTTP stream for music
// app.get("/stream", (req, res) => {
//   res
//     .set({
//       "Content-Type": "audio/mpeg",
//       "Transfer-Encoding": "chunked",
//     })
//     .status(200);

//   ws.on("message", function incoming(data) {
//     res.write(data);
//     //and convert data to audio with lamejs stream and play  


//     console.log("stream", data);
//   });
// });

// server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


/////////////

// import express from "express";
// import WebSocket from "ws";

// const app = express();
// const port = process.env.PORT || 3000; // Use environment variable for port

// // Replace with actual WebSocket server address
// const wsUrl = 'ws://10.8.0.102:8888';

// let ws;

// function connectToWebSocket() {
//   ws = new WebSocket(wsUrl);

//   ws.on('open', () => {
//     console.log('Connected to WebSocket server');
//   });

//   ws.on('message', (data) => {
//     handleAudioData(data);
//   });

//   ws.on('error', (error) => {
//     console.error('WebSocket error:', error);
//   });
// }

// connectToWebSocket();

// function handleAudioData(data) {
//   // Handle incoming audio data (e.g., decode, pipe to client)

// const audioStream = decodeAudioBuffer(data);
// pipeAudioToClient();


//   console.log('Received audio data:', data);
// }


// // Placeholder function for audio data decoding (replace with actual logic)
// function decodeAudioBuffer(data) {
//   // Implement logic to decode the audio data based on format (e.g., MP3, Opus using lamejs, ogg.js)










// }

// // Placeholder function for piping audio to client (replace with actual logic)
// function pipeAudioToClient(audioStream) {
//   // Configure response headers and pipe audio stream to response object
//   console.log('Pipes audio to client (replace with implementation)');
// }

// app.get('/stream', (req, res) => {
//   // Check for open WebSocket connection
//   if (!ws || ws.readyState !== WebSocket.OPEN) {
//     return res.status(500).send('WebSocket connection unavailable');
//   }

//   const handleClientMessage = (data) => {
//     // Handle potential client messages (e.g., control commands)
//     console.log('Received client message:', data);
//   };

//   // Handle messages from client-side WebSocket connection
//   const clientWs = new WebSocket(req.headers.upgrade !== 'websocket' ? 'ws://' : 'wss://' + req.headers.host + '/audio-stream');
//   clientWs.onmessage = handleClientMessage;

//   clientWs.onopen = () => {
//     // Once client WebSocket opens, start piping audio when available
//     ws.on('message', (data) => {
//       const decodedStream = decodeAudioBuffer(data);
//       pipeAudioToClient(decodedStream);
//     });
//   };

//   // Handle errors on client-side WebSocket
//   clientWs.onerror = (error) => {
//     console.error('Client WebSocket error:', error);
//     res.status(500).send('Error streaming audio');
//   };

//   // Close client-side WebSocket on request close
//   req.on('close', () => clientWs.close());
// });

// app.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });

///////////

// import  WebSocketClient from 'ws';
// import stream from 'stream';
// import fs from 'fs';
// import {FileWriter} from 'wav';
// import express from 'express';


// // Connect to the WebSocket server
// const ws = new WebSocketClient('ws://10.8.0.102:8888');

// const app = express();
// const port = process.env.PORT || 3000;

// ws.on('open', () => {
//   console.log('Connected to WebSocket server');
// });



// // HTTP stream for music
// app.get('/stream', (req, res) => {
//   res
//     .set({
//       'Content-Type': 'audio/wav',
//       'Transfer-Encoding': 'chunked'
//     })
//     .status(200);

//   // Handle incoming audio data to chunked response
//   ws.on('message', (data) => {
   
//     res.write(data);

//     // Convert data to audio and send to response of api 




    
//   });

//   // Handle client disconnection
//   req.on('close', () => {
//     console.log('Client disconnected');
//   });

//   console.log('Streaming audio data');

  





// });

// app.listen(port, () => console.log(`Server is running on port ${port}`));


export {};
