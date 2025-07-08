import { WebSocketServer } from 'ws';

const port = 8080; // выберите любой свободный порт

const wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    // при необходимости отправляйте сообщения обратно
    ws.send('Message received');
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server is running on ws://localhost:${port}`);