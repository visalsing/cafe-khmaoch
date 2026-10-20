import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import accessRoutes from "./routes/access.js";
import rolesRoutes from "./routes/roles.js";
import positionsRoutes from "./routes/positions.js";
import permissionsRoutes from "./routes/permissions.js";
import gendersRoutes from "./routes/genders.js";
import nationalitiesRoutes from "./routes/nationalities.js";
import heroRoutes from "./routes/hero.js";
import categoriesRoutes from "./routes/categories.js";
import drinksTypesRoutes from "./routes/drinksTypes.js";
import productsRouter from "./routes/products.js";
import mapsRouter from "./routes/maps.js";
import sugarLevelRouter from "./routes/sugarLevel.js";
import iceLevelRouter from "./routes/iceLevel.js";
import coffeeLevelRouter from "./routes/coffeeLevel.js";
import levelsOptionsRouter from "./routes/levelsOptions.js";
import countryFlagsRouter from "./routes/countryFlag.js";
import currenciesRouter from "./routes/currencies.js";
import exchangeRateRouter from "./routes/exchangeRate.js";
import rolesPermissionsRouter from "./routes/role_permissions.js";
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
// app.use(
//   "/api/uploads",
//   express.static(UPLOADS_ROOT, {
//     maxAge: "30d",
//     immutable: true,
//     index: false,
//     dotfiles: "deny",
//     setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
//   })
// );

app.use(
  "/api/uploads",
  express.static(UPLOADS_ROOT, {
    maxAge: "30d",
    immutable: true,
    index: false,
    dotfiles: "deny",
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (filePath.toLowerCase().endsWith(".svg"))
        res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    },
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/positions", positionsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/genders", gendersRoutes);
app.use("/api/nationalities", nationalitiesRoutes);
app.use("/api/hero", heroRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/drinks-types", drinksTypesRoutes);
app.use("/api/products", productsRouter);
app.use("/api/maps", mapsRouter);
app.use("/api/sugar-levels", sugarLevelRouter);
app.use("/api/ice-levels", iceLevelRouter);
app.use("/api/coffee-levels", coffeeLevelRouter);
app.use("/api/levels-options", levelsOptionsRouter);
app.use("/api/country-flags", countryFlagsRouter);
app.use("/api/currencies", currenciesRouter);
// app.use("/api/exchange-rate", exchangeRateRouter);
app.use("/api/exchange-rates", exchangeRateRouter);
app.use("/api/role-permissions", rolesPermissionsRouter);

app.use((req, res) => res.status(404).json({ error: "Not found." }));

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message }); // our own messages (400, 404, 409...)
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// const port = process.env.PORT || 4000;
// app.listen(port, () => console.log(`API running on http://localhost:${port}`));
const port = process.env.PORT || 4000;
try {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
} catch (err) {
  console.error("Failed to start server:", err);
}



app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong on the server." });
});
