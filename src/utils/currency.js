export const EXCHANGE_RATE = 4100; // 1 USD = 4100 ៛ (later this can come from the exchange_rate table)

export const formatKHR = (n) => `${Math.round(Number(n) || 0).toLocaleString()}៛`;
export const formatUSD = (n) => {
  const v = Number(n) || 0;
  return v % 1 === 0 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`;
};

// { riel: "18,000៛", usd: "≈ $4.39" }
export const dual = (khr) => ({
  riel: formatKHR(khr),
  usd: `≈ ${formatUSD((Number(khr) || 0) / EXCHANGE_RATE)}`,
});