const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const queueStates = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-queue', (data) => {
    const { doctorId, hospitalId } = data;
    const room = `queue-${doctorId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);

    const state = queueStates.get(doctorId);
    if (state) {
      socket.emit('queue-update', state);
    }
  });

  socket.on('leave-queue', (data) => {
    const room = `queue-${data.doctorId}`;
    socket.leave(room);
  });

  socket.on('update-queue', (data) => {
    const { doctorId, queueData } = data;
    queueStates.set(doctorId, queueData);
    io.to(`queue-${doctorId}`).emit('queue-update', queueData);
  });

  socket.on('next-patient', (data) => {
    const { doctorId, queueData } = data;
    queueStates.set(doctorId, queueData);
    io.to(`queue-${doctorId}`).emit('queue-update', queueData);
    io.to(`queue-${doctorId}`).emit('patient-called', {
      doctorId,
      token: queueData.currentToken,
    });
  });

  socket.on('consultation-update', (data) => {
    const { doctorId, queueData } = data;
    queueStates.set(doctorId, queueData);
    io.to(`queue-${doctorId}`).emit('queue-update', queueData);
  });

  socket.on('join-hospital', (data) => {
    const room = `hospital-${data.hospitalId}`;
    socket.join(room);
  });

  socket.on('hospital-update', (data) => {
    io.to(`hospital-${data.hospitalId}`).emit('hospital-queue-update', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
