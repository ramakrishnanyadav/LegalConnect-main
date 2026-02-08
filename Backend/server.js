import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { initAuth } from "./config/auth.js";
import { logger } from "./utils/logger.js";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import lawyerRoutes from "./routes/lawyerRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import consultationRoutes from "./routes/consultationRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

// Load environment variables
dotenv.config();

// Prevent FUNCTION_INVOCATION_FAILED: catch unhandled rejections so the process doesn't crash
process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION]", reason);
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Initialize Express app
const app = express();
let server = null;
let io = null;
let communityNamespace = null;

// Export socket variables (will remain null in production)
export { io, communityNamespace };

// Get dirname equivalent in ES modules (for local dev only)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.json({ limit: "50mb" })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://legalconnect.vercel.app",
            "https://legal-connect-main-frontend.vercel.app",
          ]
        : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  }),
);

// Connect to MongoDB only when needed (for Vercel)
let dbConnected = false;
const connectToDatabase = async () => {
  try {
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    const connected = await connectToDatabase();
    req.dbConnected = connected;
    if (!connected) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
      });
    }
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error connecting to database",
    });
  }
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize Auth.js
initAuth(app);

// API routes
app.use("/api/users", userRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to LegalConnect API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// On Vercel serverless: do NOT call app.listen() - the exported app is the request handler
// On local/traditional hosts: start the server
const isVercel = process.env.VERCEL === "1";
if (isVercel) {
  logger.info("Vercel serverless - app exported as handler");
} else if (process.env.NODE_ENV !== "production") {
  const createSocketServer = async () => {
    logger.info("Initializing Socket.io server for development");
    try {
      const http = await import("http");
      const { Server } = await import("socket.io");

      server = http.createServer(app);
      io = new Server(server, {
        cors: {
          origin: ["http://localhost:5173", "http://localhost:3000"],
          methods: ["GET", "POST", "PUT", "DELETE"],
          credentials: true,
        },
      });

      // Setup Socket.io namespaces
      communityNamespace = io.of("/community");

      // Socket.io event handlers
      communityNamespace.on("connection", (socket) => {
        logger.info(
          `New client connected to community namespace: ${socket.id}`,
        );

        socket.on("join-topic", (topicId) => {
          socket.join(`topic-${topicId}`);
          logger.debug(`Client ${socket.id} joined topic-${topicId}`);
        });

        socket.on("leave-topic", (topicId) => {
          socket.leave(`topic-${topicId}`);
          logger.debug(`Client ${socket.id} left topic-${topicId}`);
        });

        socket.on("disconnect", () => {
          logger.info(`Client disconnected: ${socket.id}`);
        });
      });

      // Make the socket instances available globally
      global.io = io;
      global.communityNamespace = communityNamespace;

      // Start server with Socket.io
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => {
        logger.info(
          `Server with socket.io running on port ${PORT} in ${process.env.NODE_ENV} mode`,
        );
      });
    } catch (error) {
      logger.error("Failed to initialize Socket.io:", error);
      startExpressServer();
    }
  };

  createSocketServer();
} else {
  // Production on non-Vercel (e.g. Railway, Render)
  logger.info("Production - starting Express server");
  startExpressServer();
}

// Function to start Express server without Socket.io
function startExpressServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(
      `Express server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
}

export default app;
