const { createServer } = require('http');
const { Server } = require('socket.io');

const port = parseInt(process.env.SOCKET_PORT || '3002', 10);
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Fleet events
  socket.on('fleet:updated', (data) => socket.broadcast.emit('fleet:updated', data));
  socket.on('fleet:statusChange', (data) => socket.broadcast.emit('fleet:statusChange', data));

  // Booking events
  socket.on('booking:created', (data) => io.emit('booking:created', data));
  socket.on('booking:updated', (data) => io.emit('booking:updated', data));
  socket.on('booking:cancelled', (data) => io.emit('booking:cancelled', data));

  // AI events
  socket.on('ai:forecast', (data) => socket.broadcast.emit('ai:forecast', data));
  socket.on('ai:anomaly', (data) => io.emit('ai:anomaly', data));

  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`> Socket.io server ready on http://0.0.0.0:${port}`);
});
