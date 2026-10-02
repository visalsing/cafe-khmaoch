import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import accessRoutes from "./routes/access.js";

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error("Missing DATABASE_URL or JWT_SECRET in server/.env");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" })); // profile photos are small (about 10-20 KB)
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/access", accessRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));