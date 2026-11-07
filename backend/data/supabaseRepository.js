const crypto = require("node:crypto");
const { Repository } = require("../repositories/repository");
const { createSupabaseClient } = require("../config/supabase");
const { AppError } = require("../utils/errors");

const USER_COLUMNS = {
  accessRole: "access_role",
  passwordHash: "password_hash",
  jobTitle: "job_title",
  createdAt: "created_at",
  updatedAt: "updated_at"
};
const MENU_COLUMNS = { createdAt: "created_at", updatedAt: "updated_at" };
const ORDER_COLUMNS = {
  customerId: "customer_id",
  customerName: "customer_name",
  customerPhone: "customer_phone",
  deliveryAddress: "delivery_address",
  riderId: "rider_id",
  paymentMethod: "payment_method",
  createdAt: "created_at",
  updatedAt: "updated_at"
};
const INVENTORY_COLUMNS = { updatedAt: "updated_at" };
const NOTIFICATION_COLUMNS = {
  read: "is_read",
  recipientUserId: "recipient_user_id",
  createdByUserId: "created_by_user_id",
  createdAt: "created_at"
};
const FEEDBACK_COLUMNS = { customerId: "customer_id", orderId: "order_id", createdAt: "created_at" };
const EMPLOYEE_SHIFT_COLUMNS = { employeeId: "employee_id", shiftName: "shift_name", startsAt: "starts_at", endsAt: "ends_at", createdAt: "created_at" };
const EMPLOYEE_ATTENDANCE_COLUMNS = {
  employeeId: "employee_id",
  attendanceDate: "attendance_date",
  checkIn: "check_in",
  checkOut: "check_out",
  createdAt: "created_at"
};

function mapFields(value, columns) {
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [columns[key] || key, fieldValue]));
}

function unmapFields(value, columns) {
  const reverse = Object.fromEntries(Object.entries(columns).map(([key, column]) => [column, key]));
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [reverse[key] || key, fieldValue]));
}

function numberFields(row, fields) {
  for (const field of fields) {
    if (row[field] !== null && row[field] !== undefined) row[field] = Number(row[field]);
  }
  return row;
}

function toUser(row) {
  return row ? numberFields(unmapFields(row, USER_COLUMNS), ["deliveries"]) : null;
}

function toMenuItem(row) {
  return row ? numberFields(unmapFields(row, MENU_COLUMNS), ["price"]) : null;
}

function toInventoryItem(row) {
  return row ? numberFields(unmapFields(row, INVENTORY_COLUMNS), ["quantity", "minimum"]) : null;
}

function toNotification(row) {
  if (!row) return null;
  const notification = unmapFields(row, NOTIFICATION_COLUMNS);
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    recipientUserId: notification.recipientUserId,
    createdByUserId: notification.createdByUserId,
    createdAt: notification.createdAt
  };
}

function toFeedback(row) {
  if (!row) return null;
  return numberFields(unmapFields(row, FEEDBACK_COLUMNS), ["rating"]);
}

function toEmployeeShift(row) {
  return row ? unmapFields(row, EMPLOYEE_SHIFT_COLUMNS) : null;
}

function toEmployeeAttendance(row) {
  return row ? unmapFields(row, EMPLOYEE_ATTENDANCE_COLUMNS) : null;
}

function toOrder(row, items = [], statusHistory = []) {
  if (!row) return null;
  return {
    ...numberFields(unmapFields(row, ORDER_COLUMNS), ["total"]),
    items: items.map((item) => numberFields({
      menuItemId: item.menu_item_id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total
    }, ["quantity", "unitPrice", "lineTotal"])),
    statusHistory: statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at,
      by: entry.by_user_id
    }))
  };
}

class SupabaseRepository extends Repository {
  constructor(client = createSupabaseClient()) {
    super();
    this.client = client;
  }

  nextId() {
    return crypto.randomUUID();
  }

  async run(operation, query) {
    let result;
    try {
      result = await query;
    } catch (error) {
      console.error("Supabase database request failed.", { operation, name: error?.name });
      throw new AppError(500, "A database operation failed.", "DATABASE_ERROR");
    }
    const { data, error } = result;
    if (error) {
      console.error("Supabase database operation failed.", {
        operation,
        code: error.code,
        status: error.status
      });
      if (error.code === "P0001" && error.message === "INSUFFICIENT_STOCK") {
        throw new AppError(409, "There is not enough inventory to confirm this order.", "INSUFFICIENT_STOCK");
      }
      if (error.code === "P0001" && error.message === "RIDER_ALREADY_ASSIGNED") {
        throw new AppError(409, "This order already has an assigned rider.", "RIDER_ALREADY_ASSIGNED");
      }
      if (error.code === "P0001" && error.message === "ORDER_PREPARATION_STARTED") {
        throw new AppError(409, "An order cannot be modified after preparation has started.", "ORDER_PREPARATION_STARTED");
      }
      if (["40001", "23505", "23503", "P0001"].includes(error.code)) {
        const code = error.code === "23503" ? "DATABASE_REFERENCE_CONFLICT" : "ORDER_CONFLICT";
        throw new AppError(409, "The order could not be updated because it changed or conflicts with current data.", code);
      }
      throw new AppError(500, "A database operation failed.", "DATABASE_ERROR");
    }
    return data;
  }

  async listUsers(predicate = () => true) {
    const rows = await this.run("list profiles", this.client.from("profiles").select("*"));
    return rows.map(toUser).filter(predicate);
  }

  async getUserById(id) {
    const row = await this.run("get profile", this.client.from("profiles").select("*").eq("id", id).maybeSingle());
    return toUser(row);
  }

  async getUserByEmail(email) {
    const escapedEmail = email.replace(/[\\%_]/g, "\\$&");
    const row = await this.run("find profile by email", this.client.from("profiles").select("*").ilike("email", escapedEmail).maybeSingle());
    return toUser(row);
  }

  async createUser(user) {
    const row = await this.run("create profile", this.client.from("profiles").insert(mapFields(user, USER_COLUMNS)).select("*").single());
    return toUser(row);
  }

  async updateUser(id, changes) {
    const row = await this.run("update profile", this.client.from("profiles").update(mapFields(changes, USER_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toUser(row);
  }

  async deleteUser(id) {
    const rows = await this.run("delete profile", this.client.from("profiles").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async listMenuCategories() {
    const rows = await this.run("list menu categories", this.client.from("menu_categories").select("name").order("name"));
    return rows.map((row) => ({ name: row.name }));
  }

  async listMenu(predicate = () => true) {
    const rows = await this.run("list menu items", this.client.from("menu_items").select("*"));
    return rows.map(toMenuItem).filter(predicate);
  }

  async getMenuItem(id) {
    const row = await this.run("get menu item", this.client.from("menu_items").select("*").eq("id", id).maybeSingle());
    return toMenuItem(row);
  }

  async createMenuItem(item) {
    const row = await this.run("create menu item", this.client.from("menu_items").insert(mapFields(item, MENU_COLUMNS)).select("*").single());
    return toMenuItem(row);
  }

  async updateMenuItem(id, changes) {
    const row = await this.run("update menu item", this.client.from("menu_items").update(mapFields(changes, MENU_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toMenuItem(row);
  }

  async deleteMenuItem(id) {
    const rows = await this.run("delete menu item", this.client.from("menu_items").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async loadOrderParts(orderIds) {
    if (orderIds.length === 0) return { items: [], history: [] };
    const [items, history] = await Promise.all([
      this.run("list order items", this.client.from("order_items").select("*").in("order_id", orderIds)),
      this.run("list order status history", this.client.from("order_status_history").select("*").in("order_id", orderIds).order("at"))
    ]);
    return { items, history };
  }

  async listOrders(predicate = () => true) {
    const rows = await this.run("list orders", this.client.from("orders").select("*").order("created_at", { ascending: false }));
    const ids = rows.map((row) => row.id);
    const { items, history } = await this.loadOrderParts(ids);
    return rows.map((row) => toOrder(
      row,
      items.filter((item) => item.order_id === row.id),
      history.filter((entry) => entry.order_id === row.id)
    )).filter(predicate);
  }

  async getOrder(id) {
    const row = await this.run("get order", this.client.from("orders").select("*").eq("id", id).maybeSingle());
    if (!row) return null;
    const { items, history } = await this.loadOrderParts([row.id]);
    return toOrder(row, items, history);
  }

  async createOrder(order) {
    const orderRow = mapFields(order, ORDER_COLUMNS);
    delete orderRow.items;
    delete orderRow.statusHistory;
    const items = order.items.map((item) => ({
      menu_item_id: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal
    }));
    const statusHistory = order.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at,
      by_user_id: entry.by
    }));
    const id = await this.run("create order atomically", this.client.rpc("quickbite_create_order_atomic", {
      p_order: orderRow,
      p_items: items,
      p_status_history: statusHistory
    }));
    if (!id) throw new AppError(500, "Order creation did not return an order ID.", "DATABASE_ERROR");
    return this.getOrder(id);
  }

  async updateOrder(id, changes) {
    const current = await this.getOrder(id);
    if (!current) return null;
    const orderChanges = mapFields(changes, ORDER_COLUMNS);
    delete orderChanges.items;
    delete orderChanges.statusHistory;
    const newHistory = (changes.statusHistory || []).slice(current.statusHistory.length);
    const statusHistory = newHistory.map((entry) => ({
      status: entry.status,
      at: entry.at,
      by_user_id: entry.by
    }));
    const updatedId = await this.run("update order atomically", this.client.rpc("quickbite_update_order_atomic", {
      p_order_id: id,
      p_expected_status: current.status,
      p_changes: orderChanges,
      p_status_history: statusHistory
    }));
    if (!updatedId) return null;
    return this.getOrder(id);
  }

  async listInventory(predicate = () => true) {
    const rows = await this.run("list inventory items", this.client.from("inventory_items").select("*"));
    return rows.map(toInventoryItem).filter(predicate);
  }

  async getInventoryItem(id) {
    const row = await this.run("get inventory item", this.client.from("inventory_items").select("*").eq("id", id).maybeSingle());
    return toInventoryItem(row);
  }

  async createInventoryItem(item) {
    const row = await this.run("create inventory item", this.client.from("inventory_items").insert(mapFields(item, INVENTORY_COLUMNS)).select("*").single());
    return toInventoryItem(row);
  }

  async updateInventoryItem(id, changes) {
    const row = await this.run("update inventory item", this.client.from("inventory_items").update(mapFields(changes, INVENTORY_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toInventoryItem(row);
  }

  async deleteInventoryItem(id) {
    const rows = await this.run("delete inventory item", this.client.from("inventory_items").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async listNotifications(predicate = () => true) {
    const rows = await this.run("list notifications", this.client.from("notifications").select("*").order("created_at", { ascending: false }));
    return rows.map(toNotification).filter(predicate);
  }

  async listNotificationsForRecipient(recipientUserId) {
    const escapedRecipientId = String(recipientUserId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const rows = await this.run(
      "list rider notifications",
      this.client.from("notifications")
        .select("*")
        .or(`recipient_user_id.eq."${escapedRecipientId}",recipient_user_id.is.null`)
        .order("created_at", { ascending: false })
    );
    return rows.map(toNotification);
  }

  async createNotification(item) {
    const row = await this.run("create notification", this.client.from("notifications").insert(mapFields(item, NOTIFICATION_COLUMNS)).select("*").single());
    return toNotification(row);
  }

  async updateNotification(id, changes) {
    const row = await this.run("update notification", this.client.from("notifications").update(mapFields(changes, NOTIFICATION_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toNotification(row);
  }

  async deleteNotification(id) {
    const rows = await this.run("delete notification", this.client.from("notifications").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async listFeedback(predicate = () => true) {
    const rows = await this.run("list customer feedback", this.client.from("customer_feedback").select("*").order("created_at", { ascending: false }));
    return rows.map(toFeedback).filter(predicate);
  }

  async listFeedbackForCustomer(customerId) {
    const rows = await this.run("list customer feedback", this.client.from("customer_feedback").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }));
    return rows.map(toFeedback);
  }

  async getFeedback(id) {
    const row = await this.run("get customer feedback", this.client.from("customer_feedback").select("*").eq("id", id).maybeSingle());
    return toFeedback(row);
  }

  async getFeedbackForOrder(orderId) {
    const row = await this.run("find feedback for order", this.client.from("customer_feedback").select("*").eq("order_id", orderId).maybeSingle());
    return toFeedback(row);
  }

  async createFeedback(item) {
    const row = await this.run("create customer feedback", this.client.from("customer_feedback").insert(mapFields(item, FEEDBACK_COLUMNS)).select("*").single());
    return toFeedback(row);
  }

  async updateFeedback(id, changes) {
    const row = await this.run("update customer feedback", this.client.from("customer_feedback").update(mapFields(changes, FEEDBACK_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toFeedback(row);
  }

  async deleteFeedback(id) {
    const rows = await this.run("delete customer feedback", this.client.from("customer_feedback").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async listEmployeeShifts(employeeId) {
    const rows = await this.run("list employee shifts", this.client.from("employee_shifts").select("*").eq("employee_id", employeeId).order("starts_at", { ascending: true }));
    return rows.map(toEmployeeShift);
  }

  async getEmployeeShift(id) {
    const row = await this.run("get employee shift", this.client.from("employee_shifts").select("*").eq("id", id).maybeSingle());
    return toEmployeeShift(row);
  }

  async createEmployeeShift(item) {
    const row = await this.run("create employee shift", this.client.from("employee_shifts").insert(mapFields(item, EMPLOYEE_SHIFT_COLUMNS)).select("*").single());
    return toEmployeeShift(row);
  }

  async updateEmployeeShift(id, changes) {
    const row = await this.run("update employee shift", this.client.from("employee_shifts").update(mapFields(changes, EMPLOYEE_SHIFT_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toEmployeeShift(row);
  }

  async deleteEmployeeShift(id) {
    const rows = await this.run("delete employee shift", this.client.from("employee_shifts").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }

  async listEmployeeAttendance(employeeId) {
    const rows = await this.run("list employee attendance", this.client.from("employee_attendance").select("*").eq("employee_id", employeeId).order("attendance_date", { ascending: false }));
    return rows.map(toEmployeeAttendance);
  }

  async getEmployeeAttendance(id) {
    const row = await this.run("get employee attendance", this.client.from("employee_attendance").select("*").eq("id", id).maybeSingle());
    return toEmployeeAttendance(row);
  }

  async createEmployeeAttendance(item) {
    const row = await this.run("create employee attendance", this.client.from("employee_attendance").insert(mapFields(item, EMPLOYEE_ATTENDANCE_COLUMNS)).select("*").single());
    return toEmployeeAttendance(row);
  }

  async updateEmployeeAttendance(id, changes) {
    const row = await this.run("update employee attendance", this.client.from("employee_attendance").update(mapFields(changes, EMPLOYEE_ATTENDANCE_COLUMNS)).eq("id", id).select("*").maybeSingle());
    return toEmployeeAttendance(row);
  }

  async deleteEmployeeAttendance(id) {
    const rows = await this.run("delete employee attendance", this.client.from("employee_attendance").delete().eq("id", id).select("id"));
    return rows.length > 0;
  }
}

module.exports = { SupabaseRepository };
