import { pool, query } from "./db.js";

export class OrderError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];
const SHOP_TIME_ZONE = process.env.SHOP_TIME_ZONE || "Asia/Phnom_Penh"; // the receipt's queue number restarts at midnight in this time zone
const ORDER_TYPES = ["dine-in", "pickup", "delivery"];
const PAY_METHODS = ["cash", "card", "qr"];
const SIZE_COLUMN = {
  price: "price",
  big: "big_size_price",
  small: "small_size_price",
};
const SIZE_LABEL = { price: "Regular", big: "Big", small: "Small" };
const GROUP = { sugar: 1, ice: 2, coffee: 3 }; // levels_options rows: 1 = sugar, 2 = ice, 3 = coffee (same as the POS page)

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const clip = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const pickName = (map) =>
  map && typeof map === "object" ? map.en || Object.values(map)[0] || "" : "";
const intOrNull = (v) =>
  v === undefined || v === null || v === "" ? null : Number(v);
const idList = (v) => (Array.isArray(v) ? v.map(Number) : []);

// empty lists mean "all", exactly like the POS and the shop
const appliesTo = (row, product) => {
  const cats = idList(row.array_categories);
  const types = idList(row.array_drinkstypes);
  return (
    (!cats.length || cats.includes(Number(product.category_id))) &&
    (!types.length || types.includes(Number(product.type_id)))
  );
};

/* =============== price an order from the DATABASE (never from the browser) =============== */
async function priceOrder(input, { staff }) {
  const raw = input.items;
  if (!Array.isArray(raw) || raw.length === 0)
    throw new OrderError("The order has no items.");
  if (raw.length > 50) throw new OrderError("Too many items in one order.");

  const lines = raw.map((r) => ({
    productId: Number(r?.productId),
    size: String(r?.size ?? "price"),
    qty: Number(r?.qty),
    picks: {
      sugar: intOrNull(r?.sugarLevelId),
      ice: intOrNull(r?.iceLevelId),
      coffee: intOrNull(r?.coffeeLevelId),
    },
  }));
  for (const l of lines) {
    if (!Number.isInteger(l.productId) || l.productId < 1)
      throw new OrderError("An item has no product.");
    if (!SIZE_COLUMN[l.size])
      throw new OrderError("An item has an invalid size.");
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99)
      throw new OrderError("Quantity must be a whole number from 1 to 99.");
    for (const [k, v] of Object.entries(l.picks))
      if (v !== null && !Number.isInteger(v))
        throw new OrderError(`An item has an invalid ${k} level.`);
  }

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const promoCode = clip(input.promoCode, 40).toUpperCase();
  const wantsDelivery = input.orderType === "delivery";

  const [settings, products, groups, sugar, ice, coffee, delivery, promo] =
    await Promise.all([
      query("SELECT * FROM store_settings WHERE id = 1"),
      query("SELECT * FROM products WHERE id = ANY($1::int[]) AND status = 1", [
        productIds,
      ]),
      query(
        "SELECT id, array_categories, array_drinkstypes FROM levels_options WHERE status = 1",
      ),
      query("SELECT * FROM sugar_level WHERE status = 1"),
      query("SELECT * FROM ice_level WHERE status = 1"),
      query("SELECT * FROM coffee_level WHERE status = 1"),
      wantsDelivery
        ? query(
            "SELECT * FROM delivery_options WHERE code = $1 AND status = 1",
            [clip(input.deliveryCode, 40) || "standard"],
          )
        : { rows: [] },
      promoCode
        ? query(
            `SELECT percent FROM promo_codes
            WHERE code = $1 AND status = 1 AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())`,
            [promoCode],
          )
        : { rows: [] },
    ]);

  const cfg = settings.rows[0];
  if (!cfg)
    throw new OrderError(
      "Store settings are missing. Run npm run db:setup.",
      500,
    );
  const productById = new Map(products.rows.map((p) => [p.id, p]));
  const groupById = new Map(groups.rows.map((g) => [g.id, g]));
  const levelRows = { sugar: sugar.rows, ice: ice.rows, coffee: coffee.rows };

  const priced = lines.map((l) => {
    const product = productById.get(l.productId);
    if (!product)
      throw new OrderError(
        "An item is no longer on the menu. Reload the menu and try again.",
        409,
      );
    const name = pickName(product.name);

    const base = product[SIZE_COLUMN[l.size]];
    if (base === null || base === undefined)
      throw new OrderError(`"${name}" is not sold in that size.`);

    const options = {};
    const ids = { sugar: null, ice: null, coffee: null };
    let extra = 0;
    for (const key of ["sugar", "ice", "coffee"]) {
      const group = groupById.get(GROUP[key]);
      const available =
        group && appliesTo(group, product)
          ? levelRows[key].filter((row) => appliesTo(row, product))
          : [];
      const pick = l.picks[key];
      if (pick === null) {
        if (available.length)
          throw new OrderError(`Choose the ${key} level for "${name}".`);
        continue;
      }
      const row = available.find((r) => r.id === pick);
      if (!row)
        throw new OrderError(
          `That ${key} level is not available for "${name}".`,
        );
      ids[key] = row.id;
      options[key] = row.name;
      if (key === "coffee") extra = Number(row.price || 0);
    }
    const offered = Object.values(SIZE_COLUMN).filter(
      (c) => product[c] !== null && product[c] !== undefined,
    ).length;
    if (offered > 1 || l.size !== "price") options.size = SIZE_LABEL[l.size];

    const discountPercent = Number(product.discount_percent || 0);
    const unit = round2(
      round2((Number(base) * (100 - discountPercent)) / 100) + extra,
    );
    return {
      product,
      size: l.size,
      qty: l.qty,
      ids,
      options,
      extra,
      base: Number(base),
      discountPercent,
      unit,
      subtotal: round2(unit * l.qty),
      taxPercent:
        product.tax_percent === null
          ? Number(cfg.default_tax_percent)
          : Number(product.tax_percent),
    };
  });

  // order discount: promo code or staff discount, whichever is bigger
  let promoPct = 0;
  if (promoCode) {
    if (!promo.rows[0]) throw new OrderError("That promo code is not valid.");
    promoPct = Number(promo.rows[0].percent);
  }
  let staffPct = 0;
  if (Number(input.staffDiscountPct) > 0) {
    if (!staff) throw new OrderError("Only staff can give a discount.", 403);
    staffPct = Number(input.staffDiscountPct);
    if (staffPct > Number(cfg.max_staff_discount_percent))
      throw new OrderError(
        `The staff discount can be ${cfg.max_staff_discount_percent}% at most.`,
      );
  }
  const discountPct = Math.max(promoPct, staffPct);

  for (const l of priced) {
    l.discount = round2((l.subtotal * discountPct) / 100);
    l.taxable = round2(l.subtotal - l.discount);
    l.tax = round2((l.taxable * l.taxPercent) / 100);
  }
  const subtotal = round2(priced.reduce((s, l) => s + l.subtotal, 0));
  const discountAmount = round2(priced.reduce((s, l) => s + l.discount, 0));
  const tax = round2(priced.reduce((s, l) => s + l.tax, 0));

  let shipping = 0;
  let deliveryCode = "";
  if (wantsDelivery) {
    if (!delivery.rows[0]) throw new OrderError("Choose a delivery option.");
    shipping = Number(delivery.rows[0].fee);
    deliveryCode = delivery.rows[0].code;
  }
  const total = round2(
    priced.reduce((s, l) => s + l.taxable, 0) + tax + shipping,
  );

  return {
    lines: priced,
    subtotal,
    discountPct,
    discountAmount,
    promo: promoPct ? promoCode : "",
    shipping,
    deliveryCode,
    tax,
    total,
    currency: cfg.currency_code,
  };
}

/* =============== the shape the dashboard pages already use =============== */
function itemToApi(i) {
  const opt = i.options || {};
  const details = [
    opt.size,
    pickName(opt.sugar),
    pickName(opt.ice),
    pickName(opt.coffee),
  ].filter(Boolean);
  const productTitle = pickName(i.product_name);
  const detailTitle = details.length ? `(${details.join(", ")})` : "";
  return {
    id: i.id,
    productId: i.product_id,
    productName: i.product_name, // all languages
    options: opt,
    productTitle,
    detailTitle,
    title: detailTitle ? `${productTitle} ${detailTitle}` : productTitle,
    size: i.size_key,
    qty: i.quantity,
    price: Number(i.unit_price),
    basePrice: round2(Number(i.base_price) + Number(i.extra_price)),
    discountPercent: Number(i.discount_percent),
    taxPercent: Number(i.tax_percent),
    lineTotal: Number(i.line_subtotal),
    sugarLevelId: i.sugar_level_id,
    iceLevelId: i.ice_level_id,
    coffeeLevelId: i.coffee_level_id,
  };
}

// function toApi(o, items, pays) {
//   const paid = pays.find((p) => p.status === "paid") || pays[0] || null;
//   const num = (v) => (v === null || v === undefined ? null : Number(v));
//   return {
//     id: o.order_number, // what the screens show ("CK-1001"); the API accepts it in URLs
//     dbId: o.id,
//     orderNumber: o.order_number,
//     source: o.source,
//     status: o.status,
//     paymentStatus: o.payment_status,
//     orderType: o.order_type,
//     table: o.table_no,
//     customer: { name: o.customer_name, phone: o.customer_phone, address: o.customer_address, notes: o.note },
//     items: items.map(itemToApi),
//     currency: o.currency_code,
//     promoCode: o.promo_code,
//     deliveryId: o.delivery_code,
//     subtotal: Number(o.subtotal),
//     discountPct: Number(o.discount_percent),
//     discount: Number(o.discount_amount),
//     shipping: Number(o.shipping),
//     tax: Number(o.tax),
//     total: Number(o.total),
//     paymentMethod: paid?.method ?? null,
//     cashReceived: num(paid?.cash_received),
//     change: num(paid?.change_given),
//     payments: pays.map((p) => ({ id: p.id, method: p.method, amount: Number(p.amount), reference: p.reference, status: p.status, createdAt: p.created_at })),
//     createdAt: o.created_at,
//     updatedAt: o.updated_at,
//     completedAt: o.completed_at,
//   };
// }

function toApi(o, items, pays, extra = {}) {
  const paid = pays.find((p) => p.status === "paid") || pays[0] || null;
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    id: o.order_number, // what the screens show ("CK-1001"); the API accepts it in URLs
    dbId: o.id,
    orderNumber: o.order_number,
    number: o.order_number, // the name the old screens use
    dailyNumber: extra.dailyNumber ?? null, // 1, 2, 3... restarts every day
    cashierName: extra.cashierName ?? "",
    customerId: o.customer_id,
    createdBy: o.created_by,
    source: o.source,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentPreference: o.payment_preference || "",
    orderType: o.order_type,
    table: o.table_no,
    customer: {
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address,
      notes: o.note,
    },
    items: items.map(itemToApi),
    currency: o.currency_code,
    promoCode: o.promo_code,
    deliveryId: o.delivery_code,
    subtotal: Number(o.subtotal),
    discountPct: Number(o.discount_percent),
    discount: Number(o.discount_amount),
    shipping: Number(o.shipping),
    tax: Number(o.tax),
    total: Number(o.total),
    paymentMethod: paid?.method ?? null,
    cashReceived: num(paid?.cash_received),
    change: num(paid?.change_given),
    payments: pays.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      reference: p.reference,
      status: p.status,
      createdAt: p.created_at,
    })),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    completedAt: o.completed_at,
  };
}

// async function hydrate(orders) {
//   if (!orders.length) return [];
//   const ids = orders.map((o) => o.id);
//   const staffIds = [...new Set(orders.map((o) => o.created_by).filter(Boolean))];

//   const [items, pays, daily, staff] = await Promise.all([
//     query("SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id", [ids]),
//     query("SELECT * FROM payments WHERE order_id = ANY($1::int[]) ORDER BY id", [ids]),
//     // the n-th order of its day (in the shop's time zone)
//     query(
//       `SELECT o.id,
//               (SELECT count(*)::int FROM orders p
//                 WHERE p.id <= o.id
//                   AND (p.created_at AT TIME ZONE $2)::date = (o.created_at AT TIME ZONE $2)::date) AS n
//          FROM orders o WHERE o.id = ANY($1::int[])`,
//       [ids, SHOP_TIME_ZONE],
//     ),
//     staffIds.length
//       ? query("SELECT id, first_name, last_name FROM users WHERE id = ANY($1::int[])", [staffIds])
//       : { rows: [] },
//   ]);

//   const group = (rows) => {
//     const m = new Map();
//     for (const r of rows) m.set(r.order_id, [...(m.get(r.order_id) || []), r]);
//     return m;
//   };
//   const itemsBy = group(items.rows);
//   const paysBy = group(pays.rows);
//   const dailyBy = new Map(daily.rows.map((r) => [r.id, r.n]));
//   const staffBy = new Map(staff.rows.map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim()]));

//   return orders.map((o) =>
//     toApi(o, itemsBy.get(o.id) || [], paysBy.get(o.id) || [], {
//       dailyNumber: dailyBy.get(o.id),
//       cashierName: staffBy.get(o.created_by) || "",
//     }),
//   );
// }

async function hydrate(orders) {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const staffIds = [
    ...new Set(orders.map((o) => o.created_by).filter(Boolean)),
  ];

  const [items, pays, daily, staff] = await Promise.all([
    query(
      "SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id",
      [ids],
    ),
    query(
      "SELECT * FROM payments WHERE order_id = ANY($1::int[]) ORDER BY id",
      [ids],
    ),
    // the n-th order of its day (in the shop's time zone)
    query(
      `SELECT o.id,
              (SELECT count(*)::int FROM orders p
                WHERE p.id <= o.id
                  AND (p.created_at AT TIME ZONE $2)::date = (o.created_at AT TIME ZONE $2)::date) AS n
         FROM orders o WHERE o.id = ANY($1::int[])`,
      [ids, SHOP_TIME_ZONE],
    ),
    staffIds.length
      ? query(
          "SELECT id, first_name, last_name FROM users WHERE id = ANY($1::int[])",
          [staffIds],
        )
      : { rows: [] },
  ]);

  const group = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.order_id, [...(m.get(r.order_id) || []), r]);
    return m;
  };
  const itemsBy = group(items.rows);
  const paysBy = group(pays.rows);
  const dailyBy = new Map(daily.rows.map((r) => [r.id, r.n]));
  const staffBy = new Map(
    staff.rows.map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim()]),
  );

  return orders.map((o) =>
    toApi(o, itemsBy.get(o.id) || [], paysBy.get(o.id) || [], {
      dailyNumber: dailyBy.get(o.id),
      cashierName: staffBy.get(o.created_by) || "",
    }),
  );
}

// "CK-1001" or the numeric id
const byRef = (ref) =>
  /^\d+$/.test(String(ref))
    ? { col: "id", val: Number(ref) }
    : { col: "order_number", val: String(ref).toUpperCase() };

export async function getOrder(ref) {
  const { col, val } = byRef(ref);
  const { rows } = await query(`SELECT * FROM orders WHERE ${col} = $1`, [val]);
  return (await hydrate(rows))[0] || null;
}

export async function listOrders(f = {}) {
  const where = [];
  const params = [];
  const add = (sql, v) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (STATUSES.includes(f.status)) add("status = ?", f.status);
  if (["pos", "online"].includes(f.source)) add("source = ?", f.source);
  if (f.from && !Number.isNaN(Date.parse(f.from)))
    add("created_at >= ?", new Date(f.from));
  if (f.to && !Number.isNaN(Date.parse(f.to)))
    add("created_at < ?", new Date(f.to));
  if (f.customerId) add("customer_id = ?", Number(f.customerId));
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 500, 1), 1000);
  const { rows } = await query(
    `SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  return hydrate(rows);
}

// orders still in progress, oldest first (the kitchen works in that order)
export async function listOpenOrders(limit = 15) {
  const cap = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
  const { rows } = await query(
    `SELECT * FROM orders WHERE status IN ('pending', 'preparing', 'ready') ORDER BY created_at ASC LIMIT ${cap}`,
  );
  return hydrate(rows);
}

/* =============== create (POS = staff takes payment now, online = unpaid) =============== */
export async function createOrder({ body, source, user }) {
  const staff = source === "pos";
  const orderType = ORDER_TYPES.includes(body.orderType)
    ? body.orderType
    : staff
      ? "dine-in"
      : "delivery";
  const customer = {
    name: clip(body.customer?.name, 120),
    phone: clip(body.customer?.phone, 40),
    address: clip(body.customer?.address, 500),
  };
  const note = clip(body.customer?.notes ?? body.note, 500);
  const table = orderType === "dine-in" ? clip(body.table, 20) : "";

  if (orderType === "delivery" && (!customer.phone || !customer.address))
    throw new OrderError("Delivery needs a phone number and an address.");
  if (!staff && (!customer.name || !customer.phone))
    throw new OrderError("Please enter your name and phone number.");

  const priced = await priceOrder(
    {
      items: body.items,
      orderType,
      deliveryCode: body.deliveryId ?? body.deliveryCode,
      promoCode: body.promoCode,
      staffDiscountPct: body.staffDiscountPct,
    },
    { staff },
  );

  // // the screen and the server must agree on the amount (rounding differences of a few cents are allowed)
  // if (staff && body.expectedTotal !== undefined && body.expectedTotal !== null) {
  //   if (Math.abs(round2(body.expectedTotal) - priced.total) > 0.05)
  //     throw new OrderError(
  //       `The total on the screen (${round2(body.expectedTotal)}) is different from the server's total (${priced.total}). Reload the menu and try again.`,
  //       409,
  //       { serverTotal: priced.total },
  //     );
  // }

  // the screen and the server must agree on the amount (rounding differences of a few cents are allowed)
  if (body.expectedTotal !== undefined && body.expectedTotal !== null) {
    if (Math.abs(round2(body.expectedTotal) - priced.total) > 0.05)
      throw new OrderError(
        staff
          ? `The total on the screen (${round2(body.expectedTotal)}) is different from the server's total (${priced.total}). Reload the menu and try again.`
          : "Some prices changed while you were ordering. Please check your cart and try again.",
        409,
        { serverTotal: priced.total },
      );
  }

  let payment = null;
  const preference =
    !staff && PAY_METHODS.includes(String(body.paymentPreference))
      ? String(body.paymentPreference)
      : "";
  if (staff) {
    const method = String(body.paymentMethod ?? "");
    if (!PAY_METHODS.includes(method))
      throw new OrderError("Choose a payment method.");
    let received = null;
    let change = null;
    if (method === "cash") {
      received = Number(body.cashReceived);
      if (!Number.isFinite(received) || received < priced.total)
        throw new OrderError("The cash received is less than the total.");
      change = round2(received - priced.total);
    }
    payment = {
      method,
      received,
      change,
      reference: clip(body.reference, 120),
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // const { rows } = await client.query(
    //   `INSERT INTO orders
    //      (source, order_type, payment_status, customer_id, created_by, customer_name, customer_phone, customer_address,
    //       table_no, note, currency_code, subtotal, discount_percent, discount_amount, promo_code, delivery_code, shipping, tax, total)
    //    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    //    RETURNING id`,
    //   [
    //     source,
    //     orderType,
    //     staff ? "paid" : "unpaid",
    //     staff ? null : (user?.id ?? null),
    //     staff ? user.id : null,
    //     customer.name,
    //     customer.phone,
    //     customer.address,
    //     table,
    //     note,
    //     priced.currency,
    //     priced.subtotal,
    //     priced.discountPct,
    //     priced.discountAmount,
    //     priced.promo,
    //     priced.deliveryCode,
    //     priced.shipping,
    //     priced.tax,
    //     priced.total,
    //   ],
    // );
    const { rows } = await client.query(
      `INSERT INTO orders
         (source, order_type, payment_status, customer_id, created_by, customer_name, customer_phone, customer_address,
          table_no, note, currency_code, subtotal, discount_percent, discount_amount, promo_code, delivery_code, shipping, tax, total,
          payment_preference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        source,
        orderType,
        staff ? "paid" : "unpaid",
        staff ? null : (user?.id ?? null),
        staff ? user.id : null,
        customer.name,
        customer.phone,
        customer.address,
        table,
        note,
        priced.currency,
        priced.subtotal,
        priced.discountPct,
        priced.discountAmount,
        priced.promo,
        priced.deliveryCode,
        priced.shipping,
        priced.tax,
        priced.total,
        preference,
      ],
    );
    const orderId = rows[0].id;

    for (const l of priced.lines)
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, size_key, quantity, base_price, discount_percent, extra_price, unit_price,
            tax_percent, line_subtotal, line_tax, sugar_level_id, ice_level_id, coffee_level_id, options)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
        [
          orderId,
          l.product.id,
          JSON.stringify(l.product.name),
          l.size,
          l.qty,
          l.base,
          l.discountPercent,
          l.extra,
          l.unit,
          l.taxPercent,
          l.subtotal,
          l.tax,
          l.ids.sugar,
          l.ids.ice,
          l.ids.coffee,
          JSON.stringify(l.options),
        ],
      );

    if (payment)
      await client.query(
        `INSERT INTO payments (order_id, method, amount, cash_received, change_given, reference, received_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          orderId,
          payment.method,
          priced.total,
          payment.received,
          payment.change,
          payment.reference,
          user.id,
        ],
      );

    await client.query("COMMIT");
    return await getOrder(orderId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* =============== status + late payment (online orders paid at the counter) =============== */
// export async function setStatus(ref, status) {
//   if (!STATUSES.includes(status)) throw new OrderError("Invalid status.");
//   const { col, val } = byRef(ref);
//   const { rows } = await query(
//     `UPDATE orders SET status = $1::text,
//             completed_at = CASE WHEN $1::text = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END,
//             cancelled_at = CASE WHEN $1::text = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE NULL END
//       WHERE ${col} = $2 RETURNING *`,
//     [status, val],
//   );
//   if (!rows[0]) throw new OrderError("Order not found.", 404);
//   return (await hydrate(rows))[0];
// }
export async function setStatus(ref, status) {
  if (!STATUSES.includes(status)) throw new OrderError("Invalid status.");
  const { col, val } = byRef(ref);

  const { rows: cfg } = await query("SELECT require_payment_before_accept FROM store_settings WHERE id = 1");
  const mustPay = cfg[0]?.require_payment_before_accept !== false; // on unless the setting says otherwise

  // one statement: an UNPAID order can only stay "pending" or be cancelled while the rule is on
  const { rows } = await query(
    `UPDATE orders SET status = $1::text,
            completed_at = CASE WHEN $1::text = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END,
            cancelled_at = CASE WHEN $1::text = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE NULL END
      WHERE ${col} = $2
        AND ($3::boolean = false OR $1::text IN ('pending', 'cancelled') OR payment_status <> 'unpaid')
      RETURNING *`,
    [status, val, mustPay],
  );

  if (!rows[0]) {
    const { rows: found } = await query(`SELECT id FROM orders WHERE ${col} = $1`, [val]);
    if (!found[0]) throw new OrderError("Order not found.", 404);
    throw new OrderError("Take the payment first, then you can accept this order.", 409, { code: "payment_required" });
  }
  return (await hydrate(rows))[0];
}

export async function addPayment(ref, body, user) {
  const { col, val } = byRef(ref);
  const { rows } = await query(
    `SELECT id, total, payment_status, status FROM orders WHERE ${col} = $1`,
    [val],
  );
  const order = rows[0];
  if (!order) throw new OrderError("Order not found.", 404);
  if (order.payment_status === "paid")
    throw new OrderError("This order is already paid.", 409);
  if (order.status === "cancelled")
    throw new OrderError("This order was cancelled.", 409);

  const method = String(body.method ?? "");
  if (!PAY_METHODS.includes(method))
    throw new OrderError("Choose a payment method.");
  const total = Number(order.total);
  let received = null;
  let change = null;
  if (method === "cash") {
    received = Number(body.cashReceived);
    if (!Number.isFinite(received) || received < total)
      throw new OrderError("The cash received is less than the total.");
    change = round2(received - total);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      "UPDATE orders SET payment_status = 'paid' WHERE id = $1 AND payment_status = 'unpaid' RETURNING id",
      [order.id],
    );
    if (!upd.rows[0]) throw new OrderError("This order is already paid.", 409);
    await client.query(
      `INSERT INTO payments (order_id, method, amount, cash_received, change_given, reference, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        order.id,
        method,
        total,
        received,
        change,
        clip(body.reference, 120),
        user.id,
      ],
    );
    await client.query("COMMIT");
    return await getOrder(order.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* =============== what the screens need before an order exists =============== */

// the server's own price for a cart: the POS and the checkout show THESE numbers
export async function quoteOrder({ body, staff }) {
  const orderType = ORDER_TYPES.includes(body.orderType)
    ? body.orderType
    : "dine-in";
  const priced = await priceOrder(
    {
      items: body.items,
      orderType,
      deliveryCode: body.deliveryId ?? body.deliveryCode,
      promoCode: body.promoCode,
      staffDiscountPct: body.staffDiscountPct,
    },
    { staff },
  );
  return {
    currency: priced.currency,
    subtotal: priced.subtotal,
    discountPct: priced.discountPct,
    discount: priced.discountAmount,
    shipping: priced.shipping,
    tax: priced.tax,
    total: priced.total,
    lines: priced.lines.map((l) => ({
      productId: l.product.id,
      size: l.size,
      qty: l.qty,
      price: l.unit,
      lineTotal: l.subtotal,
    })),
  };
}

export async function checkPromo(code) {
  const c = clip(code, 40).toUpperCase();
  const { rows } = await query(
    `SELECT code, percent FROM promo_codes
      WHERE code = $1 AND status = 1 AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())`,
    [c],
  );
  if (!rows[0]) throw new OrderError("That promo code is not valid.", 404);
  return { code: rows[0].code, percent: Number(rows[0].percent) };
}

// delivery choices + limits, read from the database
// export async function getOptions() {
//   const [settings, delivery] = await Promise.all([
//     query(
//       "SELECT currency_code, default_tax_percent, max_staff_discount_percent FROM store_settings WHERE id = 1",
//     ),
//     query(
//       "SELECT code, name, fee FROM delivery_options WHERE status = 1 ORDER BY sort_num, id",
//     ),
//   ]);
//   const s = settings.rows[0] || {};
//   return {
//     currency: s.currency_code || "KHR",
//     defaultTaxPercent: Number(s.default_tax_percent || 0),
//     maxStaffDiscountPercent: Number(s.max_staff_discount_percent ?? 20),
//     delivery: delivery.rows.map((d) => ({
//       code: d.code,
//       name: pickName(d.name),
//       fee: Number(d.fee),
//     })),
//   };
// }
export async function getOptions() {
  const [settings, delivery] = await Promise.all([
    query("SELECT currency_code, default_tax_percent, max_staff_discount_percent, require_payment_before_accept FROM store_settings WHERE id = 1"),
    query("SELECT code, name, fee FROM delivery_options WHERE status = 1 ORDER BY sort_num, id"),
  ]);
  const s = settings.rows[0] || {};
  return {
    currency: s.currency_code || "KHR",
    defaultTaxPercent: Number(s.default_tax_percent || 0),
    maxStaffDiscountPercent: Number(s.max_staff_discount_percent ?? 20),
    requirePaymentFirst: s.require_payment_before_accept !== false,
    delivery: delivery.rows.map((d) => ({ code: d.code, name: pickName(d.name), fee: Number(d.fee) })),
  };
}
