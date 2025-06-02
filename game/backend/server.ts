// backend/server.ts
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log("Client connected");

  ws.send("Welcome client!");

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    ws.send(`Server echo: ${message}`);
  });

  ws.on('close', () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server is running on ws://localhost:8080");

