const express = require("express");
const User = require('./model/User')
const cors = require("cors");
const app = express();
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const dotenv = require('dotenv');
const { Server } = require('socket.io')
const http = require('http')

dotenv.config();
connectDB();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true
    }
})

let onlineUsers = []
io.on("connection", (socket) => {

    // 1. "Check-in": User joins a room named after their unique User ID
    socket.on("setup", (userData) => {
        // Check if userData exists before trying to use it
        if (!userData || !userData?._id) return;

        socket.join(userData._id);

        onlineUsers.push({ userId: userData._id, socketId: socket.id });

        io.emit("get-online-users", onlineUsers);

        console.log(`User ${userData.username || 'Unknown'} is now online`);
        socket.emit("connected");
    });

    // 2. "Enter Meeting": User joins a specific conversation room
    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User joined conversation room: " + room);
    });

    // 3. "Broadcast": Sending the message to the other person
    socket.on("new message", (newMessageReceived) => {
        const chat = newMessageReceived.conversationId;
        if (!chat) return;

        // Send to the chat room for the active window
        socket.in(chat).emit("message received", newMessageReceived);

        // Send to the recipient's personal room using the ID we just added
        if (newMessageReceived.recipientId) {
            socket.in(newMessageReceived.recipientId).emit("update sidebar", newMessageReceived);
        }
    });

    socket.on("delete message", (data) => {
        const { messageId, conversationId } = data;
        socket.in(conversationId).emit("message deleted", { messageId });
    });
    socket.on("typing", (room) => {
        socket.in(room).emit("typing", room)
    })

    socket.on("stop typing", (room) => {
        socket.in(room).emit("stop typing", room)
    })

    socket.on("disconnect", async () => {
        const userToOffline = onlineUsers.find((u) => u.socketId === socket.id);

        if (userToOffline) {
            const logoutTime = new Date();
            try {
                await User.findByIdAndUpdate(userToOffline.userId, { lastSeen: logoutTime });

                // Broadcast to all other connected clients
                io.emit("user-status-changed", {
                    userId: userToOffline.userId,
                    lastSeen: logoutTime
                });
            } catch (err) {
                console.error('Error updating lastSeen:', err);
            }
        }

        // Cleanup memory
        onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
        io.emit("get-online-users", onlineUsers);
    });


    // Remove the specific socket that left
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    // Tell everyone the list has changed
    io.emit("get-online-users", onlineUsers);
    console.log("User left the hotel 🚪");
});




// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// Auth Routes (login, register, google)
app.use('/nutrlink/api/auth', require('./route/auth'));

// Admin Routes (approve, reject, pending)  THIS WAS MISSING!
app.use('/nutrlink/api/admin', require('./route/admin'));

app.use('/nutrlink/api/customer/profile', require('./route/customer'));

app.use('/nutrlink/api/nutritionist', require('./route/nutritionist'));

app.use('/nutrlink/api/appointments', require('./route/appointment'))

app.use('/nutrlink/api/customer/goal', require('./route/goal'));

app.use('/nutrlink/api/chat', require('./route/chat'))

app.use('/nutrlink/api/plan', require('./route/dietPlan'))
app.use('/nutrlink/api/AI', require('./route/ai'));

app.use('/nutrlink/api/dashboard', require('./route/dashboard'))

app.use('/nutrlink/api/reviews', require('./route/review'))
app.use('/nutrlink/api/calculator', require('./route/calculator'))
app.use('/nutrlink/api/progress', require('./route/progress'))
// ══════════════════════════════════════════════════════════════
// OTHER ROUTES
// ══════════════════════════════════════════════════════════════

// The Home Route
app.get('/nutrlink/login', (req, res) => {
    res.send('<a href="/nutrlink/login/google">Authentication with Google</a>');
});

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'NutriPlan API is running',
        cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Not configured'
    });
});

// ══════════════════════════════════════════════════════════════
// ERROR HANDLERS (MUST come after all routes)
// ══════════════════════════════════════════════════════════════
app.use(notFound);
app.use(errorHandler);

// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('🚀 NutriPlan Server Started');
    console.log('═'.repeat(60));
    console.log(`📡 Server:     http://localhost:${PORT}`);
    console.log(`📁 Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT CONFIGURED'}`);
    console.log(`${'═'.repeat(60)}\n`);
});