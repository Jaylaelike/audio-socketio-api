import WebSocketClient from "ws";
import stream from "stream";
import express from "express";


import pkg from 'naudiodon';
const {  SampleFormat16Bit, ToWav } = pkg;

// Connect to the WebSocket server
const ws = new WebSocketClient("ws://10.8.0.102:8888");

const app = express();
const port = process.env.PORT || 3000;

ws.on("open", () => {
  console.log("Connected to WebSocket server");
});

// Create an AudioIO object
const ao = new pkg.AudioIO({
  outOptions: {
    channelCount: 2,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: -1,
    closeOnError: true,
  },
});

// HTTP stream for music
app.get("/stream", (req, res) => {
  res
    .set({
      "Content-Type": "audio/wav",
      "Transfer-Encoding": "chunked",
    })
    .status(200);

  // Handle incoming audio data to chunked response
  ws.on("message", (data) => {
    // Convert data to audio and send to response of api
    const readable = new stream.Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(data);
    readable.push(null);

    readable.pipe(ao);
    readable.pipe(new ToWav()).pipe(res);

    console.log("Data received:" + data);
  });

  // Handle client disconnection
  req.on("close", () => {
    console.log("Client disconnected");
  });

  console.log("Streaming audio data");
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
