import { http } from "./http.js";

export const dashboardService = {
  get: (range = 7) => http(`/dashboard?range=${range}`),
  setGoals: (dailySalesGoal, dailyOrdersGoal) =>
    http("/dashboard/goals", { method: "PUT", body: { dailySalesGoal, dailyOrdersGoal } }),
};