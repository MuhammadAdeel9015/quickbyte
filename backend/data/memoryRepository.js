const { createSeedData } = require("./seed");
const { Repository } = require("../repositories/repository");
const { AppError } = require("../utils/errors");

const clone = (value) => structuredClone(value);

class MemoryRepository extends Repository {
  constructor(seed = createSeedData()) {
    super();
    this.state = seed;
  }

  nextId(prefix) {
    const value = this.state.counters[prefix] || 1;
    this.state.counters[prefix] = value + 1;
    return `${prefix}-${String(value).padStart(4, "0")}`;
  }

  listUsers(predicate = () => true) { return this.state.users.filter(predicate).map(clone); }
  getUserById(id) { return clone(this.state.users.find((item) => item.id === id) || null); }
  getUserByEmail(email) { return clone(this.state.users.find((item) => item.email.toLowerCase() === email.toLowerCase()) || null); }
  createUser(user) { this.state.users.push(clone(user)); return clone(user); }
  updateUser(id, changes) {
    const index = this.state.users.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.state.users[index] = { ...this.state.users[index], ...clone(changes) };
    return clone(this.state.users[index]);
  }
  deleteUser(id) {
    const index = this.state.users.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.state.users.splice(index, 1);
    return true;
  }

  listMenuCategories() {
    return [...new Set(this.listMenu((item) => item.available).map((item) => item.category))]
      .map((name) => ({ name }));
  }

  listMenu(predicate = () => true) { return this.state.menu.filter(predicate).map(clone); }
  getMenuItem(id) { return clone(this.state.menu.find((item) => item.id === id) || null); }
  createMenuItem(item) { this.state.menu.push(clone(item)); return clone(item); }
  updateMenuItem(id, changes) {
    const index = this.state.menu.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.state.menu[index] = { ...this.state.menu[index], ...clone(changes) };
    return clone(this.state.menu[index]);
  }
  deleteMenuItem(id) {
    const index = this.state.menu.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.state.menu.splice(index, 1);
    return true;
  }

  listOrders(predicate = () => true) { return this.state.orders.filter(predicate).map(clone); }
  getOrder(id) { return clone(this.state.orders.find((item) => item.id === id) || null); }
  createOrder(order) { this.state.orders.push(clone(order)); return clone(order); }
  updateOrder(id, changes) {
    const index = this.state.orders.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.state.orders[index];
    if (current.status !== "Pending" && ["items", "customerId", "customerName", "customerPhone", "deliveryAddress", "total", "paymentMethod"].some((key) => key in changes)) {
      throw new AppError(409, "An order cannot be modified after preparation has started.", "ORDER_PREPARATION_STARTED");
    }
    if (current.riderId && changes.riderId && current.riderId !== changes.riderId) {
      throw new AppError(409, "This order already has an assigned rider.", "RIDER_ALREADY_ASSIGNED");
    }
    const nextRiderId = Object.hasOwn(changes, "riderId") ? changes.riderId : current.riderId;
    if (changes.status === "Assigned" && !nextRiderId) {
      throw new AppError(409, "An assigned order must have a rider.", "RIDER_REQUIRED");
    }
    if (current.status === "Confirmed" && changes.status === "Confirmed") return clone(current);

    if (current.status === "Pending" && changes.status === "Confirmed" &&
        !this.state.inventoryTransactions.some((transaction) => transaction.referenceOrderId === id && transaction.reason === "order_confirmation")) {
      const requiredByInventory = new Map();
      for (const orderItem of current.items) {
        for (const ingredient of this.state.menuItemIngredients.filter((entry) => entry.menuItemId === orderItem.menuItemId)) {
          requiredByInventory.set(
            ingredient.inventoryItemId,
            (requiredByInventory.get(ingredient.inventoryItemId) || 0) + ingredient.quantityRequired * orderItem.quantity
          );
        }
      }

      const deductions = [...requiredByInventory].map(([inventoryItemId, quantity]) => {
        const stock = this.state.inventory.find((item) => item.id === inventoryItemId);
        if (!stock) throw new AppError(409, "An inventory item for this order was not found.", "DATABASE_REFERENCE_CONFLICT");
        if (stock.quantity < quantity) throw new AppError(409, "There is not enough inventory to confirm this order.", "INSUFFICIENT_STOCK");
        return { stock, quantity };
      });

      const actorUserId = changes.statusHistory?.[changes.statusHistory.length - 1]?.by || null;
      const createdAt = new Date().toISOString();
      for (const { stock, quantity } of deductions) {
        stock.quantity -= quantity;
        stock.updatedAt = createdAt;
        this.state.inventoryTransactions.push({
          inventoryItemId: stock.id,
          quantityChange: -quantity,
          quantityAfter: stock.quantity,
          reason: "order_confirmation",
          referenceOrderId: id,
          actorUserId,
          createdAt
        });
      }
    }
    this.state.orders[index] = { ...this.state.orders[index], ...clone(changes) };
    return clone(this.state.orders[index]);
  }

  listInventory(predicate = () => true) { return this.state.inventory.filter(predicate).map(clone); }
  getInventoryItem(id) { return clone(this.state.inventory.find((item) => item.id === id) || null); }
  createInventoryItem(item) { this.state.inventory.push(clone(item)); return clone(item); }
  updateInventoryItem(id, changes) {
    const index = this.state.inventory.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.state.inventory[index] = { ...this.state.inventory[index], ...clone(changes) };
    return clone(this.state.inventory[index]);
  }
  deleteInventoryItem(id) {
    const index = this.state.inventory.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.state.inventory.splice(index, 1);
    return true;
  }

  listNotifications(predicate = () => true) { return this.state.notifications.filter(predicate).map(clone); }
  listNotificationsForRecipient(recipientUserId) {
    return this.listNotifications((item) => item.recipientUserId == null || item.recipientUserId === recipientUserId);
  }
  createNotification(item) { this.state.notifications.unshift(clone(item)); return clone(item); }
  updateNotification(id, changes) {
    const index = this.state.notifications.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.state.notifications[index] = { ...this.state.notifications[index], ...clone(changes) };
    return clone(this.state.notifications[index]);
  }
  deleteNotification(id) {
    const index = this.state.notifications.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.state.notifications.splice(index, 1);
    return true;
  }

  listFeedback(predicate = () => true) { return this.state.feedback.filter(predicate).map(clone); }
  listFeedbackForCustomer(customerId) { return this.listFeedback((item) => item.customerId === customerId); }
  getFeedback(id) { return clone(this.state.feedback.find((item) => item.id === Number(id)) || null); }
  getFeedbackForOrder(orderId) { return clone(this.state.feedback.find((item) => item.orderId === orderId) || null); }
  createFeedback(item) {
    const feedback = { ...clone(item), id: this.state.counters.FB++ };
    this.state.feedback.push(feedback);
    return clone(feedback);
  }
  updateFeedback(id, changes) {
    const index = this.state.feedback.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    this.state.feedback[index] = { ...this.state.feedback[index], ...clone(changes) };
    return clone(this.state.feedback[index]);
  }
  deleteFeedback(id) {
    const index = this.state.feedback.findIndex((item) => item.id === Number(id));
    if (index < 0) return false;
    this.state.feedback.splice(index, 1);
    return true;
  }

  listEmployeeShifts(employeeId) { return this.state.employeeShifts.filter((item) => item.employeeId === employeeId).map(clone); }
  getEmployeeShift(id) { return clone(this.state.employeeShifts.find((item) => item.id === Number(id)) || null); }
  createEmployeeShift(item) {
    const shift = { ...clone(item), id: this.state.counters.SHIFT++ };
    this.state.employeeShifts.push(shift);
    return clone(shift);
  }
  updateEmployeeShift(id, changes) {
    const index = this.state.employeeShifts.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    this.state.employeeShifts[index] = { ...this.state.employeeShifts[index], ...clone(changes) };
    return clone(this.state.employeeShifts[index]);
  }
  deleteEmployeeShift(id) {
    const index = this.state.employeeShifts.findIndex((item) => item.id === Number(id));
    if (index < 0) return false;
    this.state.employeeShifts.splice(index, 1);
    return true;
  }

  listEmployeeAttendance(employeeId) { return this.state.employeeAttendance.filter((item) => item.employeeId === employeeId).map(clone); }
  getEmployeeAttendance(id) { return clone(this.state.employeeAttendance.find((item) => item.id === Number(id)) || null); }
  createEmployeeAttendance(item) {
    const attendance = { ...clone(item), id: this.state.counters.ATTENDANCE++ };
    this.state.employeeAttendance.push(attendance);
    return clone(attendance);
  }
  updateEmployeeAttendance(id, changes) {
    const index = this.state.employeeAttendance.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    this.state.employeeAttendance[index] = { ...this.state.employeeAttendance[index], ...clone(changes) };
    return clone(this.state.employeeAttendance[index]);
  }
  deleteEmployeeAttendance(id) {
    const index = this.state.employeeAttendance.findIndex((item) => item.id === Number(id));
    if (index < 0) return false;
    this.state.employeeAttendance.splice(index, 1);
    return true;
  }

  reset() { this.state = createSeedData(); }
}

module.exports = { MemoryRepository };
