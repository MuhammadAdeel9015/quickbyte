const { periodBounds } = require("../utils/date");
const { TERMINAL } = require("./orderService");

class ReportService {
  constructor(repository) { this.repository = repository; }

  async sales(period) {
    const bounds = periodBounds(period);
    if (!bounds) return null;
    const orders = (await this.repository.listOrders((order) => {
      if (order.status === "Cancelled" || order.status === "Rejected") return false;
      const created = new Date(order.createdAt);
      return created >= bounds.start && created <= bounds.end;
    }));
    const best = new Map();
    orders.forEach((order) => order.items.forEach((item) => {
      const row = best.get(item.menuItemId) || { menuItemId: item.menuItemId, name: item.name, quantity: 0, revenue: 0 };
      row.quantity += item.quantity;
      row.revenue += item.lineTotal;
      best.set(item.menuItemId, row);
    }));
    return {
      period, from: bounds.start.toISOString(), to: bounds.end.toISOString(),
      ordersCount: orders.length,
      completedOrders: orders.filter((order) => order.status === "Delivered").length,
      revenue: Number(orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)),
      averageOrderValue: orders.length ? Number((orders.reduce((sum, order) => sum + order.total, 0) / orders.length).toFixed(2)) : 0,
      bestSellers: [...best.values()].sort((a, b) => b.quantity - a.quantity)
    };
  }

  async dashboard() {
    const [orders, users, inventory] = await Promise.all([
      this.repository.listOrders(),
      this.repository.listUsers(),
      this.repository.listInventory()
    ]);
    return {
      totalOrders: orders.length,
      totalCustomers: users.filter((user) => user.role === "customer").length,
      totalRiders: users.filter((user) => user.role === "rider").length,
      activeRiders: users.filter((user) => user.role === "rider" && user.active && user.availability !== "Off duty").length,
      availableRiders: users.filter((user) => user.role === "rider" && user.active && user.availability === "Available").length,
      totalEmployees: users.filter((user) => user.role === "employee" && user.active).length,
      totalRevenue: Number(orders.filter((order) => !["Cancelled", "Rejected"].includes(order.status)).reduce((sum, order) => sum + order.total, 0).toFixed(2)),
      activeOrders: orders.filter((order) => !TERMINAL.has(order.status)).length,
      lowStockItems: inventory.filter((item) => item.quantity <= item.minimum).length
    };
  }
}

module.exports = { ReportService };
