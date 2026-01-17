import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.IO server
 * @param {object} httpServer - HTTP server instance
 * @returns {object} Socket.IO server instance
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.FRONTEND_URL 
        : ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    },
  });

  // Track connected users
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user connection
    socket.on("user:connect", (userId) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        // Broadcast updated online users list
        io.emit("users:online", Array.from(onlineUsers.keys()));
        console.log(`User ${userId} connected`);
      }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      // Find and remove the disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("users:online", Array.from(onlineUsers.keys()));
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {object} Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}; 