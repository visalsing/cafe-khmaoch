import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware.js";
import { getDashboard, setGoals } from "../dashboard.js";

const router = Router();
const isAdmin = (user) => (user?.role ?? user?.role_code) === "admin";

router.get("/", requireAuth, requirePermission("dashboard"), async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await getDashboard({ range: req.query.range, admin: isAdmin(req.user) }));
});

// only an administrator changes the daily goals
router.put("/goals", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Only an administrator can change the goals." });

  const sales = Number(req.body?.dailySalesGoal);
  const orders = Number(req.body?.dailyOrdersGoal);
  if (!Number.isFinite(sales) || sales < 0 || sales > 1e11)
    return res.status(400).json({ error: "The sales goal must be a number of 0 or more." });
  if (!Number.isInteger(orders) || orders < 0 || orders > 100000)
    return res.status(400).json({ error: "The orders goal must be a whole number of 0 or more." });

  res.json(await setGoals(Math.round(sales * 100) / 100, orders));
});

export default router;