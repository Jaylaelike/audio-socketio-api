import { v4 as uuid } from "uuid";
import { PassThrough } from "stream";
// import { Throttle } from "throttle"; 
import pkg from 'throttle';
const { Throttle } = pkg; // Add import statement for Throttle
import { ffprobe } from "@dropb/ffprobe";
import ffprobeStatic from "ffprobe-static";
import { readdir } from "fs/promises";
import { createReadStream } from "fs";
import { extname, join } from "path";


ffprobe.path = ffprobeStatic.path;

class Queue {
  constructor() {
    this.tracks = [];
    this.index = 0;
    this.clients = new Map();

    this.bufferHeader = {
      sampleRate: 44100,
      channels: 1,
      bitDepth: 16,
    };
  }

  current() {
    return this.tracks[this.index];
  }

  broadcast(chunk) {
    this.clients.forEach((client) => {
      client.write(chunk);
    });
  }

  addClient() {
    const id = uuid();
    const client = new PassThrough();
    // Write buffer header to the client
    const header = Buffer.alloc(44); // 44-byte WAV header
    header.write("RIFF", 0); // ChunkID
    header.writeUInt32LE(36, 4); // ChunkSize
    header.write("WAVE", 8); // Format
    header.write("fmt ", 12); // Subchunk1ID
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat
    header.writeUInt16LE(this.bufferHeader.channels, 22); // NumChannels
    header.writeUInt32LE(this.bufferHeader.sampleRate, 24); // SampleRate
    header.writeUInt32LE(
      (this.bufferHeader.sampleRate *
        this.bufferHeader.channels *
        this.bufferHeader.bitDepth) /
        8,
      28
    ); // ByteRate
    header.writeUInt16LE(
      (this.bufferHeader.channels * this.bufferHeader.bitDepth) / 8,
      32
    ); // BlockAlign
    header.writeUInt16LE(this.bufferHeader.bitDepth, 34); // BitsPerSample
    header.write("data", 36); // Subchunk2ID
    header.writeUInt32LE(0, 40); // Subchunk2Size

    client.write(header);

    this.clients.set(id, client);
    return { id, client };
  }

  removeClient(id) {
    this.clients.delete(id);
  }

  async loadTracks(dir) {
    try {
      let filenames = await readdir(dir);
      filenames = filenames.filter((filename) => extname(filename) === ".wav");

      // Add directory name back to filenames
      const filepaths = filenames.map((filename) => join(dir, filename));

      const promises = filepaths.map(async (filepath) => {
        const bitrate = await this.getTrackBitrate(filepath);

        return { filepath, bitrate };
      });

      this.tracks = await Promise.all(promises);
      console.log(`Loaded ${this.tracks.length} tracks`);
    } catch (error) {
      console.error("Error loading tracks:", error);
    }
  }

  async getTrackBitrate(filepath) {
    const data = await ffprobe(filepath);
    const bitrate = data?.format?.bit_rate;

    return bitrate ? parseInt(bitrate) : 128000;
  }

  getNextTrack() {
    // Loop back to the first track
    if (this.index >= this.tracks.length - 1) {
      this.index = 0;
    }

    const track = this.tracks[this.index++];
    this.currentTrack = track;

    return track;
  }

  pause() {
    if (!this.started() || !this.playing) return;
    this.playing = false;
    console.log("Paused");
    this.throttle.removeAllListeners("end");
    this.throttle.end();
  }

  resume() {
    if (!this.started() || this.playing) return;
    console.log("Resumed");
    this.start();
  }

  started() {
    return this.stream && this.throttle && this.currentTrack;
  }

  // Play new track if there's no current track or useNewTrack is true
  // Otherwise, resume the current track
  play(useNewTrack = false) {
    if (useNewTrack || !this.currentTrack) {
      console.log("Playing new track");
      this.getNextTrack();
      this.loadTrackStream();
      this.start();
    } else {
      this.resume();
    }
  }

  // Get the stream from the filepath
  loadTrackStream() {
    const track = this.currentTrack;
    if (!track) return;

    console.log("Starting audio stream");
    this.stream = createReadStream(track.filepath);
  }

  // Start broadcasting audio stream
  async start() {
    const track = this.currentTrack;
    if (!track) return;

    this.playing = true;
    this.throttle = new pkg(track.bitrate / 8);

    this.stream
      .pipe(this.throttle)
      .on("data", (chunk) => this.broadcast(chunk))
      .on("end", () => this.play(true))
      .on("error", () => this.play(true));
  }
}
const queue = new Queue();
export default queue;
