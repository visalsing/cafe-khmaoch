import React from "react";
import useLocalized from "../../hooks/useLocalized";
import { khr } from "../../utils/dashboardFormat";
import DonutCard, { topWithOther } from "./DonutCard.jsx";

export default function SalesChart({ categories = [], range = 7 }) {
  const tr = useLocalized();
  const items = topWithOther(
    categories.map((c) => ({
      key: c.categoryId ?? "none", // drinks of a deleted category fall into "Other"
      label: tr(c.name) || "Other",
      value: c.revenue,
      sub: `${c.qty} sold`,
    })),
    5,
  );

  return <DonutCard title="Sales by Category" subtitle={`Share of revenue · last ${range} days`} items={items} format={khr} />;
}