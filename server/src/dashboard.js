import { query } from "./db.js";
import { listOrders, listOpenOrders } from "./orders.js";

const TZ = process.env.SHOP_TIME_ZONE || "Asia/Phnom_Penh";
export const RANGES = [7, 30, 90];

const num = (v) => Number(v) || 0;
const money = (v) => Math.round(num(v) * 100) / 100;
const rows = async (sql, params = []) => (await query(sql, params)).rows;
// the charts do not need to be recounted every 20 seconds: keep them for a minute
const INSIGHTS_TTL_MS = 60 * 1000;
const cache = new Map();
async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// SQL pieces shared by the queries. $1 = the shop time zone, $2 = the number of days of the range.
const TODAY = "(now() AT TIME ZONE $1)::date";
const dayOf = (col) => `(${col} AT TIME ZONE $1)::date`;
const FROM = `${TODAY} - ($2::int - 1)`; // first day of the selected range
const PREV_FROM = `${TODAY} - (2 * $2::int - 1)`; // first day of the range before it
const PREV_TO = `${TODAY} - $2::int`; // last day of the range before it
// cheap filter first, so the created_at index does most of the work
const within = (col, factor = 1) => `${col} >= now() - ((${factor} * $2::int + 1) * interval '1 day')`;

/* ---------------------------- SQL ---------------------------- */

// today vs the SAME TIME yesterday, so the percentage is fair all day long
const KPI_SQL = `
  WITH t AS (
    SELECT ${TODAY} AS today, (now() AT TIME ZONE $1)::time AS now_tod
  ), x AS (
    SELECT o.total, o.payment_status,
           ${dayOf("o.created_at")} AS day,
           (o.created_at AT TIME ZONE $1)::time AS tod
      FROM orders o
     WHERE o.status <> 'cancelled' AND o.created_at >= now() - interval '3 days'
  )
  SELECT
    count(*) FILTER (WHERE x.day = t.today)::int AS orders_today,
    count(*) FILTER (WHERE x.day = t.today - 1 AND x.tod <= t.now_tod)::int AS orders_yesterday,
    coalesce(sum(x.total) FILTER (WHERE x.day = t.today AND x.payment_status = 'paid'), 0) AS sales_today,
    coalesce(sum(x.total) FILTER (WHERE x.day = t.today - 1 AND x.tod <= t.now_tod AND x.payment_status = 'paid'), 0) AS sales_yesterday,
    count(*) FILTER (WHERE x.day = t.today AND x.payment_status = 'paid')::int AS paid_today,
    count(*) FILTER (WHERE x.day = t.today - 1 AND x.tod <= t.now_tod AND x.payment_status = 'paid')::int AS paid_yesterday
  FROM x CROSS JOIN t`;

// the live queue + money still to collect (all time, not only today)
const QUEUE_SQL = `
  SELECT
    count(*) FILTER (WHERE status = 'pending')::int   AS pending,
    count(*) FILTER (WHERE status = 'preparing')::int AS preparing,
    count(*) FILTER (WHERE status = 'ready')::int     AS ready,
    count(*) FILTER (WHERE status = 'pending' AND source = 'online')::int AS online_waiting,
    count(*) FILTER (WHERE payment_status = 'unpaid' AND status <> 'cancelled')::int AS unpaid_count,
    coalesce(sum(total) FILTER (WHERE payment_status = 'unpaid' AND status <> 'cancelled'), 0) AS unpaid_total
  FROM orders
  WHERE status IN ('pending', 'preparing', 'ready') OR (payment_status = 'unpaid' AND status <> 'cancelled')`;

// one row per day, zero-filled
const TREND_SQL = `
  SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
         coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS sales,
         coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid' AND o.source = 'pos'), 0) AS pos_sales,
         coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid' AND o.source = 'online'), 0) AS online_sales,
         count(o.id)::int AS orders,
         count(o.id) FILTER (WHERE o.source = 'pos')::int AS pos_orders,
         count(o.id) FILTER (WHERE o.source = 'online')::int AS online_orders
    FROM generate_series(${TODAY}::timestamp - (($2::int - 1) * interval '1 day'), ${TODAY}::timestamp, interval '1 day') AS g(d)
    LEFT JOIN orders o
      ON ${dayOf("o.created_at")} = g.d::date
     AND o.status <> 'cancelled'
     AND ${within("o.created_at")}
   GROUP BY g.d
   ORDER BY g.d`;

const TREND_PREV_SQL = `
  SELECT coalesce(sum(total) FILTER (WHERE payment_status = 'paid'), 0) AS sales, count(*)::int AS orders
    FROM orders
   WHERE status <> 'cancelled'
     AND ${within("created_at", 2)}
     AND ${dayOf("created_at")} BETWEEN ${PREV_FROM} AND ${PREV_TO}`;

// busy hours: 24 buckets over the range
const HOURS_SQL = `
  SELECT h::int AS hour,
         count(o.id)::int AS orders,
         coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS sales
    FROM generate_series(0, 23) AS h
    LEFT JOIN orders o
      ON extract(hour FROM o.created_at AT TIME ZONE $1)::int = h
     AND o.status <> 'cancelled'
     AND ${within("o.created_at")}
     AND ${dayOf("o.created_at")} >= ${FROM}
   GROUP BY h
   ORDER BY h`;

// best sellers per PRODUCT (not per title text), this range vs the one before
const PRODUCTS_SQL = `
  SELECT coalesce(oi.product_id::text, 'n:' || coalesce(oi.product_name->>'en', '')) AS pkey,
         min(oi.product_id) AS product_id,
         (array_agg(oi.product_name ORDER BY o.created_at DESC))[1] AS name,
         coalesce(sum(oi.quantity) FILTER (WHERE ${dayOf("o.created_at")} >= ${FROM}), 0)::int AS qty,
         coalesce(round(sum(oi.line_subtotal * (100 - o.discount_percent) / 100) FILTER (WHERE ${dayOf("o.created_at")} >= ${FROM}), 2), 0) AS revenue,
         coalesce(sum(oi.quantity) FILTER (WHERE ${dayOf("o.created_at")} < ${FROM}), 0)::int AS prev_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
   WHERE o.status <> 'cancelled'
     AND ${within("o.created_at", 2)}
     AND ${dayOf("o.created_at")} >= ${PREV_FROM}
   GROUP BY 1
  HAVING coalesce(sum(oi.quantity) FILTER (WHERE ${dayOf("o.created_at")} >= ${FROM}), 0) > 0
   ORDER BY qty DESC, revenue DESC
   LIMIT 6`;

const CATEGORIES_SQL = `
  SELECT c.id AS category_id, c.name,
         coalesce(sum(oi.quantity), 0)::int AS qty,
         coalesce(round(sum(oi.line_subtotal * (100 - o.discount_percent) / 100), 2), 0) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
   WHERE o.status <> 'cancelled'
     AND ${within("o.created_at")}
     AND ${dayOf("o.created_at")} >= ${FROM}
   GROUP BY c.id, c.name
   ORDER BY revenue DESC`;

const PAYMENTS_SQL = `
  SELECT p.method, count(*)::int AS count, coalesce(round(sum(p.amount), 2), 0) AS amount
    FROM payments p
    JOIN orders o ON o.id = p.order_id
   WHERE p.status = 'paid' AND o.status <> 'cancelled'
     AND ${within("p.created_at")}
     AND ${dayOf("p.created_at")} >= ${FROM}
   GROUP BY p.method
   ORDER BY amount DESC`;

const TYPES_SQL = `
  SELECT order_type AS type, source, count(*)::int AS count,
         coalesce(sum(total) FILTER (WHERE payment_status = 'paid'), 0) AS sales
    FROM orders
   WHERE status <> 'cancelled'
     AND ${within("created_at")}
     AND ${dayOf("created_at")} >= ${FROM}
   GROUP BY order_type, source`;

const CUSTOMERS_SQL = `
  SELECT count(*)::int AS total,
         count(*) FILTER (WHERE ${dayOf("u.created_at")} = ${TODAY})::int AS new_today,
         count(*) FILTER (WHERE ${dayOf("u.created_at")} >= ${FROM})::int AS new_range
    FROM users u
    JOIN roles r ON r.id = u.role_id
   WHERE r.code = 'customer' AND u.is_removed = 0`;

// weekday x hour (1 = Monday ... 7 = Sunday)
const HEAT_SQL = `
  SELECT extract(isodow FROM o.created_at AT TIME ZONE $1)::int AS dow,
         extract(hour   FROM o.created_at AT TIME ZONE $1)::int AS hour,
         count(*)::int AS orders
    FROM orders o
   WHERE o.status <> 'cancelled'
     AND ${within("o.created_at")}
     AND ${dayOf("o.created_at")} >= ${FROM}
   GROUP BY 1, 2`;

// what customers choose. The names come from the order itself (a copy), so renamed or deleted levels still count
const prefSql = (nameExpr, { join = "", where = "" } = {}) => `
  SELECT ${nameExpr} AS name, sum(oi.quantity)::int AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    ${join}
   WHERE o.status <> 'cancelled'
     ${where}
     AND ${within("o.created_at")}
     AND ${dayOf("o.created_at")} >= ${FROM}
   GROUP BY 1
   ORDER BY qty DESC
   LIMIT 8`;

const SUGAR_SQL = prefSql("oi.options->'sugar'", { where: "AND oi.options->'sugar' IS NOT NULL" });
const ICE_SQL = prefSql("oi.options->'ice'", { where: "AND oi.options->'ice' IS NOT NULL" });
const COFFEE_SQL = prefSql("oi.options->'coffee'", { where: "AND oi.options->'coffee' IS NOT NULL" });
const SIZE_SQL = prefSql("oi.size_key", { where: "AND oi.options->'size' IS NOT NULL" });
const DRINK_TYPE_SQL = prefSql("t.name", {
  join: "JOIN products p ON p.id = oi.product_id JOIN drinks_type t ON t.id = p.type_id",
});

// minutes from "ordered" to "Completed": the MEDIAN, so one forgotten order cannot spoil the number
const SPEED_SQL = `
  SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (o.completed_at - o.created_at)) / 60))::numeric, 1) AS minutes,
         count(o.id)::int AS done
    FROM generate_series(${TODAY}::timestamp - (($2::int - 1) * interval '1 day'), ${TODAY}::timestamp, interval '1 day') AS g(d)
    LEFT JOIN orders o
      ON ${dayOf("o.created_at")} = g.d::date
     AND o.status = 'completed' AND o.completed_at IS NOT NULL
     AND ${within("o.created_at")}
   GROUP BY g.d
   ORDER BY g.d`;

const SPEED_TOTAL_SQL = `
  SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (completed_at - created_at)) / 60))::numeric, 1) AS minutes,
         count(*)::int AS done
    FROM orders
   WHERE status = 'completed' AND completed_at IS NOT NULL
     AND ${within("created_at")}
     AND ${dayOf("created_at")} >= ${FROM}`;

/* ----------------------- admin-only data ----------------------- */

async function getAdminInsights(params) {
  const [staff, customers, sessions, openSessions, otp] = await Promise.all([
    rows(
      `SELECT o.created_by AS user_id, u.first_name, u.last_name,
              count(*)::int AS orders,
              coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS sales
         FROM orders o JOIN users u ON u.id = o.created_by
        WHERE o.source = 'pos' AND o.status <> 'cancelled'
          AND ${within("o.created_at")} AND ${dayOf("o.created_at")} >= ${FROM}
        GROUP BY o.created_by, u.first_name, u.last_name
        ORDER BY sales DESC, orders DESC
        LIMIT 5`,
      params,
    ),
    rows(
      `SELECT o.customer_id AS user_id, u.first_name, u.last_name,
              count(*)::int AS orders,
              coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS spent
         FROM orders o JOIN users u ON u.id = o.customer_id
        WHERE o.status <> 'cancelled'
          AND ${within("o.created_at")} AND ${dayOf("o.created_at")} >= ${FROM}
        GROUP BY o.customer_id, u.first_name, u.last_name
        ORDER BY spent DESC, orders DESC
        LIMIT 5`,
      params,
    ),
    rows(
      `SELECT l.id, l.started_at, l.ended_at, l.end_reason,
              a.first_name AS admin_first, a.last_name AS admin_last,
              t.first_name AS target_first, t.last_name AS target_last
         FROM impersonation_logs l
         JOIN users a ON a.id = l.admin_user_id
         JOIN users t ON t.id = l.target_user_id
        ORDER BY l.started_at DESC
        LIMIT 5`,
    ),
    rows(`SELECT count(*)::int AS n FROM impersonation_logs WHERE ended_at IS NULL AND started_at > now() - interval '12 hours'`),
    rows(`SELECT event_type, count(*)::int AS n FROM email_otp_events WHERE created_at >= now() - interval '24 hours' GROUP BY event_type`),
  ]);

  const fullName = (first, last) => [first, last].filter(Boolean).join(" ");
  return {
    staff: staff.map((r) => ({ userId: r.user_id, name: fullName(r.first_name, r.last_name), orders: num(r.orders), sales: money(r.sales) })),
    topCustomers: customers.map((r) => ({ userId: r.user_id, name: fullName(r.first_name, r.last_name), orders: num(r.orders), spent: money(r.spent) })),
    impersonation: {
      open: num(openSessions[0]?.n),
      recent: sessions.map((r) => ({
        id: String(r.id),
        startedAt: r.started_at,
        endedAt: r.ended_at,
        endReason: r.end_reason || "",
        adminName: fullName(r.admin_first, r.admin_last),
        targetName: fullName(r.target_first, r.target_last),
      })),
    },
    otp24h: Object.fromEntries(otp.map((r) => [r.event_type, num(r.n)])),
  };
}

/* --------------------------- the answer --------------------------- */

// everything that is not "live": cached for a minute
async function loadInsights(days) {
  const p = [TZ, days];
  const [trendRows, prevRows, hourRows, heatRows, productRows, categoryRows, paymentRows, typeRows, customerRows, sugar, ice, coffee, size, drinkType, speedRows, speedTotal] =
    await Promise.all([
      rows(TREND_SQL, p),
      rows(TREND_PREV_SQL, p),
      rows(HOURS_SQL, p),
      rows(HEAT_SQL, p),
      rows(PRODUCTS_SQL, p),
      rows(CATEGORIES_SQL, p),
      rows(PAYMENTS_SQL, p),
      rows(TYPES_SQL, p),
      rows(CUSTOMERS_SQL, p),
      rows(SUGAR_SQL, p),
      rows(ICE_SQL, p),
      rows(COFFEE_SQL, p),
      rows(SIZE_SQL, p),
      rows(DRINK_TYPE_SQL, p),
      rows(SPEED_SQL, p),
      rows(SPEED_TOTAL_SQL, p),
    ]);

  const prev = prevRows[0] || {};
  const customers = customerRows[0] || {};
  const pref = (list) => list.map((r) => ({ name: r.name, qty: num(r.qty) }));

  const trend = trendRows.map((r) => ({
    day: r.day,
    sales: money(r.sales),
    posSales: money(r.pos_sales),
    onlineSales: money(r.online_sales),
    orders: num(r.orders),
    posOrders: num(r.pos_orders),
    onlineOrders: num(r.online_orders),
  }));

  return {
    trend,
    trendTotals: {
      sales: money(trend.reduce((s, d) => s + d.sales, 0)),
      orders: trend.reduce((s, d) => s + d.orders, 0),
      prevSales: money(prev.sales),
      prevOrders: num(prev.orders),
    },
    hours: hourRows.map((r) => ({ hour: num(r.hour), orders: num(r.orders), sales: money(r.sales) })),
    heat: heatRows.map((r) => ({ dow: num(r.dow), hour: num(r.hour), orders: num(r.orders) })),
    products: productRows.map((r) => ({ productId: r.product_id, name: r.name, qty: num(r.qty), revenue: money(r.revenue), prevQty: num(r.prev_qty) })),
    categories: categoryRows.map((r) => ({ categoryId: r.category_id, name: r.name, qty: num(r.qty), revenue: money(r.revenue) })),
    payments: paymentRows.map((r) => ({ method: r.method, count: num(r.count), amount: money(r.amount) })),
    orderTypes: typeRows.map((r) => ({ type: r.type, source: r.source, count: num(r.count), sales: money(r.sales) })),
    customers: { total: num(customers.total), newToday: num(customers.new_today), newRange: num(customers.new_range) },
    prefs: { sugar: pref(sugar), ice: pref(ice), coffee: pref(coffee), size: pref(size), type: pref(drinkType) },
    speed: {
      medianMinutes: speedTotal[0]?.minutes === null || speedTotal[0]?.minutes === undefined ? null : num(speedTotal[0].minutes),
      done: num(speedTotal[0]?.done),
      series: speedRows.map((r) => ({ day: r.day, minutes: r.minutes === null ? null : num(r.minutes), done: num(r.done) })),
    },
  };
}

export async function getDashboard({ range, admin = false }) {
  const days = RANGES.includes(Number(range)) ? Number(range) : 7;

  // the live part is read every time, the charts at most once a minute
  const [kpiRows, queueRows, settingsRows, open, latest, insights, adminData] = await Promise.all([
    rows(KPI_SQL, [TZ]),
    rows(QUEUE_SQL),
    // rows("SELECT currency_code, daily_sales_goal, daily_orders_goal FROM store_settings WHERE id = 1"),
    rows("SELECT currency_code, daily_sales_goal, daily_orders_goal, require_payment_before_accept FROM store_settings WHERE id = 1"),
    listOpenOrders(15),
    listOrders({ limit: 8 }),
    cached(`insights:${days}`, INSIGHTS_TTL_MS, () => loadInsights(days)),
    admin ? cached(`admin:${days}`, INSIGHTS_TTL_MS, () => getAdminInsights([TZ, days])) : Promise.resolve(null),
  ]);

  const kpi = kpiRows[0] || {};
  const queue = queueRows[0] || {};
  const settings = settingsRows[0] || {};

  const sales = money(kpi.sales_today);
  const salesYesterday = money(kpi.sales_yesterday);
  const paid = num(kpi.paid_today);
  const paidYesterday = num(kpi.paid_yesterday);

  return {
    generatedAt: new Date().toISOString(),
    timeZone: TZ,
    range: days,
    currency: settings.currency_code || "KHR",
    goals: { sales: money(settings.daily_sales_goal), orders: num(settings.daily_orders_goal) },
    rules: { requirePaymentFirst: settings.require_payment_before_accept !== false },
    today: {
      orders: num(kpi.orders_today),
      ordersYesterday: num(kpi.orders_yesterday),
      sales,
      salesYesterday,
      paidOrders: paid,
      avg: paid ? money(sales / paid) : 0,
      avgYesterday: paidYesterday ? money(salesYesterday / paidYesterday) : 0,
    },
    queue: {
      pending: num(queue.pending),
      preparing: num(queue.preparing),
      ready: num(queue.ready),
      onlineWaiting: num(queue.online_waiting),
      unpaidCount: num(queue.unpaid_count),
      unpaidTotal: money(queue.unpaid_total),
    },
    ...insights,
    open,
    recent: latest,
    ...(adminData ? { admin: adminData } : {}),
  };
}

export async function setGoals(dailySalesGoal, dailyOrdersGoal) {
  const { rows: out } = await query(
    `UPDATE store_settings SET daily_sales_goal = $1, daily_orders_goal = $2 WHERE id = 1
     RETURNING daily_sales_goal, daily_orders_goal`,
    [dailySalesGoal, dailyOrdersGoal],
  );
  return { sales: money(out[0]?.daily_sales_goal), orders: num(out[0]?.daily_orders_goal) };
}