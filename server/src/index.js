import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import accessRoutes from "./routes/access.js";
import heroRoutes from "./routes/hero.js";
import categoriesRoutes from "./routes/categories.js";
import drinksTypesRoutes from "./routes/drinksTypes.js";
import productsRouter from "./routes/products.js";
import mapsRouter from "./routes/maps.js";
import { UPLOADS_ROOT } from "./storage.js";

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error("Missing DATABASE_URL or JWT_SECRET in server/.env");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
// behind a host's proxy (Render, Railway...) so rate limiting sees the real visitor IP
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" })); // JSON bodies (profile photos are small, about 10-20 KB)
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// uploaded images: random file names that never change, so browsers can cache them for a long time
app.use(
  "/api/uploads",
  express.static(UPLOADS_ROOT, {
    maxAge: "30d",
    immutable: true,
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/hero", heroRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/drinks-types", drinksTypesRoutes);
app.use("/api/products", productsRouter);
app.use("/api/maps", mapsRouter);

app.use((req, res) => res.status(404).json({ error: "Not found." }));

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message }); // our own messages (400, 404, 409...)
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
