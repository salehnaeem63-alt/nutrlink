const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Appointment = require('./model/Appointment');
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// =============================
// CONNECT TO DATABASE
// =============================
const connectDB = require('./config/db');
connectDB();

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', async ({ roomId, userId, username }) => {
    try {
      if (!roomId) {
        socket.emit("room-id-missing");
        return;
      }

      // =============================
      // VALIDATE APPOINTMENT EXISTS
      // =============================
      const appointment = await Appointment.findById(roomId)
        .populate('nutritionistId', 'username')
        .populate('customerId', 'username');

      if (!appointment) {
        socket.emit("invalid-room", { message: "Appointment not found" });
        return;
      }

      // =============================
      // CHECK APPOINTMENT STATUS
      // =============================
      if (appointment.status !== 'booked') {
        socket.emit("invalid-room", { 
          message: `This appointment is ${appointment.status}. Only booked appointments can start a video call.` 
        });
        return;
      }

      // =============================
      // VERIFY USER IS PARTICIPANT
      // =============================
      const isNutritionist = appointment.nutritionistId._id.toString() === userId;
      const isCustomer = appointment.customerId && appointment.customerId._id.toString() === userId;

      if (!isNutritionist && !isCustomer) {
        socket.emit("not-authorized", { 
          message: "You are not a participant in this appointment" 
        });
        return;
      }

      // =============================
      // CHECK APPOINTMENT TIME (Optional - uncomment if needed)
      // =============================
      /*
      const appointmentDate = new Date(appointment.date);
      const currentDate = new Date();
      
      // Extract time from timeSlot (e.g., "10:00 AM - 11:00 AM")
      const timeMatch = appointment.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        appointmentDate.setHours(hours, minutes, 0, 0);
        
        // Allow joining 15 minutes before and up to 2 hours after
        const fifteenMinutesBefore = new Date(appointmentDate.getTime() - 15 * 60000);
        const twoHoursAfter = new Date(appointmentDate.getTime() + 120 * 60000);
        
        if (currentDate < fifteenMinutesBefore || currentDate > twoHoursAfter) {
          socket.emit("wrong-time", { 
            message: "The appointment time window has passed or hasn't started yet",
            appointmentTime: appointmentDate.toISOString()
          });
          return;
        }
      }
      */

      // =============================
      // CREATE ROOM IF NOT EXISTS
      // =============================
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const room = rooms.get(roomId);

      // =============================
      // PREVENT MORE THAN 2 USERS
      // =============================
      if (room.size >= 2) {
        socket.emit('room-full', { message: "Room is full. Maximum 2 participants allowed." });
        return;
      }

      // =============================
      // PREVENT DUPLICATE USER
      // =============================
      for (let [_, user] of room.entries()) {
        if (user.userId === userId) {
          socket.emit("already-joined", { message: "You are already in this room from another tab/device" });
          return;
        }
      }

      // =============================
      // JOIN ROOM
      // =============================
      socket.join(roomId);

      room.set(socket.id, {
        userId,
        username,
        socketId: socket.id
      });

      // =============================
      // SEND EXISTING USERS
      // =============================
      const participants = Array.from(room.entries())
        .filter(([id]) => id !== socket.id)
        .map(([id, user]) => ({
          socketId: id,
          username: user.username,
          userId: user.userId
        }));

      socket.emit('room-users', { participants });

      // =============================
      // NOTIFY OTHERS
      // =============================
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        userId
      });

      // If 2 users joined → call ready
      if (room.size === 2) {
        io.to(roomId).emit("call-ready");
      }

      console.log(`✅ User ${username} (${userId}) joined room ${roomId}`);
      console.log(`   Room size: ${room.size}/2`);

    } catch (err) {
      console.error('❌ Error in join-room:', err);
      socket.emit("server-error", { message: "An error occurred while joining the room" });
    }
  });

  // =============================
  // WEBRTC SIGNALING
  // =============================

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  // =============================
  // OPTIONAL: MIC / CAMERA STATUS
  // =============================
  socket.on("toggle-mic", ({ roomId, enabled }) => {
    socket.to(roomId).emit("user-mic-changed", {
      userId: socket.id,
      enabled
    });
  });

  socket.on("toggle-camera", ({ roomId, enabled }) => {
    socket.to(roomId).emit("user-camera-changed", {
      userId: socket.id,
      enabled
    });
  });

  // =============================
  // LEAVE ROOM
  // =============================
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(socket, roomId);
  });

  // =============================
  // DISCONNECT
  // =============================
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        handleLeaveRoom(socket, roomId);
      }
    }
  });
});

// =============================
// HANDLE LEAVE
// =============================
function handleLeaveRoom(socket, roomId) {
  if (!rooms.has(roomId)) return;

  const room = rooms.get(roomId);
  const user = room.get(socket.id);

  if (!user) return;

  room.delete(socket.id);
  socket.leave(roomId);

  // Notify others
  socket.to(roomId).emit('user-left', {
    socketId: socket.id
  });

  console.log(`👋 User ${user.username} left room ${roomId}`);

  // If empty → delete room
  if (room.size === 0) {
    rooms.delete(roomId);
    console.log(`🗑️  Room ${roomId} deleted`);
  } else {
    // If one user left → call ended
    socket.to(roomId).emit("call-ended");
  }
}

// =============================
// START SERVER
// =============================
const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('🎥 Video Call Socket.IO Server Started');
  console.log('═'.repeat(60));
  console.log(`📡 Server:  http://localhost:${PORT}`);
  console.log(`🔌 Socket:  Connected to MongoDB`);
  console.log(`${'═'.repeat(60)}\n`);
});