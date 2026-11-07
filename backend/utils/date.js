function periodBounds(period, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (period === "month") start.setDate(1);
  else if (period !== "day") return null;
  const end = new Date(start);
  if (period === "week") end.setDate(start.getDate() + 6);
  else if (period === "month") end.setMonth(start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

module.exports = { periodBounds };
