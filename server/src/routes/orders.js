import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, optionalAuth, requirePermission, requireAnyPermission } from "../middleware.js";
// import { OrderError, createOrder, listOrders, getOrder, setStatus, addPayment } from "../orders.js";
import { OrderError, createOrder, listOrders, getOrder, setStatus, addPayment, quoteOrder, checkPromo, getOptions } from "../orders.js";

const router = Router();

// known problems become a clear message for the screen; anything else goes to the normal error handler
const run = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message, ...err.extra });
    next(err);
  }
};

const onlineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // limit: 10,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders from this connection. Please try again in a few minutes." },
});

const canSee = [requireAuth, requireAnyPermission("orders", "pos", "dashboard", "reports")];

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000, 
  // limit: 90, 
  limit: 300,
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
const promoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many promo code attempts. Please try again in a few minutes." },
});

// what a customer may see of their own order
const customerView = (o) => ({
  id: o.id,
  number: o.number,
  orderNumber: o.orderNumber,
  dailyNumber: o.dailyNumber,
  source: o.source,
  status: o.status,
  paymentStatus: o.paymentStatus,
  paymentPreference: o.paymentPreference,
  paymentMethod: o.paymentMethod,
  orderType: o.orderType,
  table: o.table,
  customer: o.customer,
  items: o.items,
  currency: o.currency,
  promoCode: o.promoCode,
  subtotal: o.subtotal,
  discountPct: o.discountPct,
  discount: o.discount,
  shipping: o.shipping,
  tax: o.tax,
  total: o.total,
  cashReceived: o.cashReceived,
  change: o.change,
  createdAt: o.createdAt,
  completedAt: o.completedAt,
});

// the signed-in customer's own orders
router.get("/mine", requireAuth, run(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const rows = await listOrders({ customerId: req.user.id, limit: 100 });
  res.json(rows.map(customerView));
}));

// public: delivery choices + limits (the checkout needs them too)
router.get("/options", run(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await getOptions());
}));

router.get("/promo/:code", promoLimiter, run(async (req, res) => {
  res.json(await checkPromo(req.params.code));
}));

// the server prices a cart; a staff discount is only allowed for people with the "pos" permission
router.post("/quote", quoteLimiter, optionalAuth, run(async (req, res) => {
  const staff = Boolean(req.permissions?.includes("pos"));
  res.json(await quoteOrder({ body: req.body || {}, staff }));
}));

// list: ?status=pending&source=online&from=2026-10-01&to=2026-10-31&limit=500
router.get("/", ...canSee, run(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await listOrders(req.query));
}));

// the signed-in customer's own orders
router.get("/mine", requireAuth, run(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await listOrders({ customerId: req.user.id, limit: 100 }));
}));

router.get("/:ref", ...canSee, run(async (req, res) => {
  const order = await getOrder(req.params.ref);
  if (!order) throw new OrderError("Order not found.", 404);
  res.json(order);
}));

// POS: a cashier creates the order AND takes the payment
router.post("/", requireAuth, requirePermission("pos"), run(async (req, res) => {
  res.status(201).json(await createOrder({ body: req.body || {}, source: "pos", user: req.user }));
}));

// website checkout: public, created unpaid. A signed-in customer is remembered on the order
router.post("/online", onlineLimiter, optionalAuth, run(async (req, res) => {
  res.status(201).json(await createOrder({ body: req.body || {}, source: "online", user: req.user ?? null }));
}));

router.patch("/:ref/status", requireAuth, requirePermission("orders"), run(async (req, res) => {
  res.json(await setStatus(req.params.ref, req.body?.status));
}));

// an unpaid (online) order gets paid at the counter
router.post("/:ref/payments", requireAuth, requireAnyPermission("orders", "pos"), run(async (req, res) => {
  res.status(201).json(await addPayment(req.params.ref, req.body || {}, req.user));
}));

export default router;