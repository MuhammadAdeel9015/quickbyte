const { AppError } = require("../utils/errors");

const CUSTOMER_TRANSITIONS = { Pending: ["Cancelled"], Confirmed: ["Cancelled"] };
const RIDER_TRANSITIONS = {
  Assigned: ["Accepted", "Rejected"],
  Accepted: ["Picked Up"],
  "Picked Up": ["On the Way"],
  "On the Way": ["Delivered"]
};
const TERMINAL = new Set(["Delivered", "Rejected", "Cancelled"]);

class OrderService {
  constructor(repository) { this.repository = repository; }

  async create(customer, input) {
    const lines = await Promise.all(input.items.map(async (line) => {
      const menuItem = await this.repository.getMenuItem(line.menuItemId);
      if (!menuItem || !menuItem.available) throw new AppError(400, `Menu item ${line.menuItemId} is unavailable.`, "INVALID_ORDER_ITEM");
      return { menuItemId: menuItem.id, name: menuItem.name, quantity: line.quantity, unitPrice: menuItem.price, lineTotal: Number((menuItem.price * line.quantity).toFixed(2)) };
    }));
    const total = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
    return this.repository.createOrder({
      id: this.repository.nextId("QB"), customerId: customer.id, customerName: customer.name,
      customerPhone: customer.phone || "", deliveryAddress: input.deliveryAddress.trim(),
      items: lines, total, status: "Pending", riderId: null,
      paymentMethod: input.paymentMethod || "Cash", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), statusHistory: [{ status: "Pending", at: new Date().toISOString(), by: customer.id }]
    });
  }

  async getForCustomer(orderId, customer) {
    const order = await this.repository.getOrder(orderId);
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (order.customerId !== customer.id) throw new AppError(403, "You cannot access another customer's order.", "FORBIDDEN");
    return order;
  }

  async getForRider(orderId, rider) {
    const order = await this.repository.getOrder(orderId);
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (order.riderId !== rider.id) throw new AppError(403, "This order is not assigned to you.", "FORBIDDEN");
    return order;
  }

  async cancel(orderId, customer) {
    const order = await this.getForCustomer(orderId, customer);
    if (!CUSTOMER_TRANSITIONS[order.status]?.includes("Cancelled")) {
      throw new AppError(409, `An order in ${order.status} status cannot be cancelled by the customer.`, "INVALID_ORDER_TRANSITION");
    }
    return this.transition(order, "Cancelled", customer.id, null);
  }

  async assign(orderId, riderId, adminId) {
    const order = await this.repository.getOrder(orderId);
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (order.status === "Assigned" && order.riderId === riderId) return order;
    if (order.status !== "Confirmed") throw new AppError(409, "Only confirmed orders can be assigned.", "INVALID_ORDER_TRANSITION");
    const rider = await this.repository.getUserById(riderId);
    if (!rider || rider.role !== "rider" || !rider.active || rider.availability !== "Available") {
      throw new AppError(409, "The selected rider is unavailable.", "RIDER_UNAVAILABLE");
    }
    const activeOrders = await this.repository.listOrders((candidate) =>
      candidate.id !== order.id && candidate.riderId === riderId && !TERMINAL.has(candidate.status));
    const alreadyBusy = activeOrders.length > 0;
    if (alreadyBusy) throw new AppError(409, "The rider already has an active delivery.", "RIDER_BUSY");
    const updated = await this.transition(order, "Assigned", adminId, riderId);
    await this.repository.updateUser(riderId, { availability: "On delivery" });
    return updated;
  }

  async riderAction(orderId, rider, action) {
    const order = await this.getForRider(orderId, rider);
    const next = { accept: "Accepted", reject: "Rejected", pickup: "Picked Up", onTheWay: "On the Way", delivered: "Delivered" }[action];
    if (!next || !RIDER_TRANSITIONS[order.status]?.includes(next)) {
      throw new AppError(409, `Cannot ${action} an order in ${order.status} status.`, "INVALID_ORDER_TRANSITION");
    }
    const updated = await this.transition(order, next, rider.id, rider.id);
    if (next === "Rejected" || next === "Delivered") await this.repository.updateUser(rider.id, { availability: "Available", ...(next === "Delivered" ? { deliveries: (rider.deliveries || 0) + 1 } : {}) });
    return updated;
  }

  async adminStatus(orderId, status, adminId) {
    const order = await this.repository.getOrder(orderId);
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (order.status === "Confirmed" && status === "Confirmed") return order;
    const transitions = { Pending: ["Confirmed", "Cancelled"], Confirmed: ["Cancelled"], Assigned: ["Cancelled", "Rejected"] };
    if (!["Pending", "Confirmed", "Assigned"].includes(order.status) && !TERMINAL.has(order.status)) {
      throw new AppError(403, "This order status can only be updated by its assigned rider.", "FORBIDDEN");
    }
    if (TERMINAL.has(order.status) || !transitions[order.status]?.includes(status)) {
      throw new AppError(409, `Cannot change an order from ${order.status} to ${status}.`, "INVALID_ORDER_TRANSITION");
    }
    const oldRider = order.riderId;
    const updated = await this.transition(order, status, adminId, status === "Cancelled" || status === "Rejected" ? null : oldRider);
    if (oldRider && ["Delivered", "Cancelled", "Rejected"].includes(status)) await this.repository.updateUser(oldRider, { availability: "Available" });
    return updated;
  }

  async transition(order, status, actorId, riderId) {
    const at = new Date().toISOString();
    return this.repository.updateOrder(order.id, {
      status, riderId, updatedAt: at,
      statusHistory: [...(order.statusHistory || []), { status, at, by: actorId }]
    });
  }
}

module.exports = { OrderService, CUSTOMER_TRANSITIONS, RIDER_TRANSITIONS, TERMINAL };
