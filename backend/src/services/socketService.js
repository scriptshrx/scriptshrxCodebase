const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

const init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://localhost:5000",
                "https://scriptishrx.net",
                "https://www.scriptishrx.net",
                process.env.FRONTEND_URL
            ].filter(Boolean),
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (token) {
            try {
                const user = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = user;
                next();
            } catch (err) {
                next(new Error("Authentication error"));
            }
        } else {
            next();
        }
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        if (socket.user) {
            // Join room for specific user (for private notifications)
            socket.join(`user:${socket.user.userId}`);

            // Join room for tenant (for team updates)
            if (socket.user.tenantId) {
                socket.join(`tenant:${socket.user.tenantId}`);
            }
        }

        socket.on("disconnect", () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Send notification to specific user
const sendToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

// Send notification to tenant
const sendToTenant = (tenantId, event, data) => {
    if (io) {
        io.to(`tenant:${tenantId}`).emit(event, data);
    }
};

module.exports = {
    init,
    getIO,
    sendToUser,
    sendToTenant
};
