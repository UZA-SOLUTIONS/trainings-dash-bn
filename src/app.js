import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getClientOrigins } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import cohortRoutes from "./routes/cohortRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import assessmentRoutes from "./routes/assessmentRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";

function isAllowedProductionOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return false;
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname === "uzamobility.com" || hostname.endsWith(".uzamobility.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const allowed = getClientOrigins();
        if (allowed.includes(origin) || isAllowedProductionOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "Training dashboard API is healthy",
      data: { status: "ok" },
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/cohorts", cohortRoutes);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/modules", moduleRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/assessments", assessmentRoutes);
  app.use("/api/issues", issueRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
