const bcrypt = require("bcryptjs");
const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");
const { rolePermissions } = require("../middleware/authorize");

async function ensureEmailAvailable(repository, email, exceptId) {
  const normalized = email.trim().toLowerCase();
  const existing = await repository.getUserByEmail(normalized);
  if (existing && existing.id !== exceptId) throw new AppError(409, "Email is already registered.", "EMAIL_IN_USE");
  return normalized;
}

function adminController({ repository, orderService, reportService, notificationService, inventoryService, employeeWorkforceService }) {
  const listByRole = async (role) => (await repository.listUsers((user) => user.role === role)).map(publicUser);
  return {
    dashboard: async (req, res) => res.json({ data: await reportService.dashboard() }),
    customers: async (req, res) => res.json({ data: await listByRole("customer") }),
    createCustomer: async (req, res) => {
      const email = await ensureEmailAvailable(repository, req.body.email);
      const customer = await repository.createUser({
        id: repository.nextId("CUS"), role: "customer", name: req.body.name.trim(), email,
        phone: req.body.phone.trim(), address: req.body.address?.trim() || "",
        active: req.body.status !== "Inactive", passwordHash: await bcrypt.hash(req.body.password, 10),
        createdAt: new Date().toISOString()
      });
      res.status(201).json({ data: publicUser(customer) });
    },
    updateCustomer: async (req, res) => {
      const customer = await repository.getUserById(req.params.id);
      if (!customer || customer.role !== "customer") throw new AppError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
      const changes = { ...req.body };
      if (changes.email) changes.email = await ensureEmailAvailable(repository, changes.email, customer.id);
      if (changes.name) changes.name = changes.name.trim();
      if (changes.phone) changes.phone = changes.phone.trim();
      res.json({ data: publicUser(await repository.updateUser(customer.id, changes)) });
    },
    deleteCustomer: async (req, res) => {
      const customer = await repository.getUserById(req.params.id);
      if (!customer || customer.role !== "customer") throw new AppError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
      await repository.deleteUser(customer.id);
      res.status(204).end();
    },
    riders: async (req, res) => res.json({ data: await listByRole("rider") }),
    createRider: async (req, res) => {
      const email = await ensureEmailAvailable(repository, req.body.email);
      const rider = await repository.createUser({
        id: repository.nextId("RID"), role: "rider", name: req.body.name.trim(), email,
        phone: req.body.phone.trim(), vehicle: req.body.vehicle || "Bicycle",
        availability: "Available", deliveries: 0, active: true,
        passwordHash: await bcrypt.hash(req.body.password, 10), createdAt: new Date().toISOString()
      });
      res.status(201).json({ data: publicUser(rider) });
    },
    updateRider: async (req, res) => {
      const rider = await repository.getUserById(req.params.id);
      if (!rider || rider.role !== "rider") throw new AppError(404, "Rider not found.", "RIDER_NOT_FOUND");
      const activeOrders = await repository.listOrders((order) => order.riderId === rider.id && !["Delivered", "Rejected", "Cancelled"].includes(order.status));
      if ((req.body.availability || req.body.active === false) && activeOrders.length) {
        throw new AppError(409, "Rider has active deliveries.", "RIDER_HAS_ACTIVE_ORDERS");
      }
      const changes = {};
      ["name", "email", "phone", "vehicle", "availability", "active"].forEach((key) => {
        if (key in req.body) changes[key] = req.body[key];
      });
      if (changes.email) changes.email = await ensureEmailAvailable(repository, changes.email, rider.id);
      res.json({ data: publicUser(await repository.updateUser(rider.id, changes)) });
    },
    deleteRider: async (req, res) => {
      const rider = await repository.getUserById(req.params.id);
      if (!rider || rider.role !== "rider") throw new AppError(404, "Rider not found.", "RIDER_NOT_FOUND");
      if ((await repository.listOrders((order) => order.riderId === rider.id && !["Delivered", "Rejected", "Cancelled"].includes(order.status))).length) {
        throw new AppError(409, "Rider has active deliveries.", "RIDER_HAS_ACTIVE_ORDERS");
      }
      await repository.deleteUser(rider.id);
      res.status(204).end();
    },
    employees: async (req, res) => res.json({ data: await listByRole("employee") }),
    createEmployee: async (req, res) => {
      const email = await ensureEmailAvailable(repository, req.body.email);
      const employee = await repository.createUser({
        id: repository.nextId("EMP"), role: "employee", accessRole: req.body.accessRole || "Staff",
        name: req.body.name.trim(), email, phone: req.body.phone.trim(),
        jobTitle: req.body.jobTitle.trim(), shift: req.body.shift || "Day",
        status: req.body.status || "Active", joined: req.body.joined || new Date().toISOString().slice(0, 10),
        active: req.body.status !== "Inactive",
        passwordHash: await bcrypt.hash(req.body.password, 10), createdAt: new Date().toISOString()
      });
      res.status(201).json({ data: publicUser(employee) });
    },
    updateEmployee: async (req, res) => {
      const employee = await repository.getUserById(req.params.id);
      if (!employee || employee.role !== "employee") throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
      if (req.body.accessRole && req.user.accessRole !== "Super Admin") throw new AppError(403, "Only a Super Admin can change portal roles.", "FORBIDDEN");
      const changes = {};
      ["name", "email", "phone", "jobTitle", "accessRole", "shift", "status", "joined", "active"].forEach((key) => {
        if (key in req.body) changes[key] = req.body[key];
      });
      if (changes.email) changes.email = await ensureEmailAvailable(repository, changes.email, employee.id);
      if (changes.status) changes.active = changes.status !== "Inactive";
      res.json({ data: publicUser(await repository.updateUser(employee.id, changes)) });
    },
    deleteEmployee: async (req, res) => {
      const employee = await repository.getUserById(req.params.id);
      if (!employee || employee.role !== "employee") throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
      await repository.deleteUser(employee.id);
      res.status(204).end();
    },
    employeeShifts: async (req, res) => res.json({ data: await employeeWorkforceService.listShifts(req.params.id) }),
    createEmployeeShift: async (req, res) => res.status(201).json({ data: await employeeWorkforceService.createShift(req.params.id, req.body) }),
    updateEmployeeShift: async (req, res) => res.json({ data: await employeeWorkforceService.updateShift(req.params.id, req.params.shiftId, req.body) }),
    deleteEmployeeShift: async (req, res) => {
      await employeeWorkforceService.deleteShift(req.params.id, req.params.shiftId);
      res.status(204).end();
    },
    employeeAttendance: async (req, res) => res.json({ data: await employeeWorkforceService.listAttendance(req.params.id) }),
    createEmployeeAttendance: async (req, res) => res.status(201).json({ data: await employeeWorkforceService.createAttendance(req.params.id, req.body) }),
    updateEmployeeAttendance: async (req, res) => res.json({ data: await employeeWorkforceService.updateAttendance(req.params.id, req.params.attendanceId, req.body) }),
    deleteEmployeeAttendance: async (req, res) => {
      await employeeWorkforceService.deleteAttendance(req.params.id, req.params.attendanceId);
      res.status(204).end();
    },
    roles: (req, res) => res.json({ data: Object.entries(rolePermissions).map(([name, resources]) => ({ name, permissions: [...resources] })) }),
    assignRole: async (req, res) => {
      if (!["Super Admin", "Manager", "Staff"].includes(req.body.accessRole)) throw new AppError(400, "Unknown access role.", "INVALID_ACCESS_ROLE");
      const employee = await repository.getUserById(req.params.id);
      if (!employee || employee.role !== "employee") throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
      res.json({ data: publicUser(await repository.updateUser(employee.id, { accessRole: req.body.accessRole })) });
    },
    menu: async (req, res) => res.json({ data: await repository.listMenu() }),
    createMenu: async (req, res) => res.status(201).json({ data: await repository.createMenuItem({ image: "", available: true, ...req.body, id: repository.nextId("FOOD") }) }),
    updateMenu: async (req, res) => {
      const item = await repository.updateMenuItem(req.params.id, req.body);
      if (!item) throw new AppError(404, "Menu item not found.", "MENU_ITEM_NOT_FOUND");
      res.json({ data: item });
    },
    deleteMenu: async (req, res) => {
      if (!await repository.deleteMenuItem(req.params.id)) throw new AppError(404, "Menu item not found.", "MENU_ITEM_NOT_FOUND");
      res.status(204).end();
    },
    inventory: async (req, res) => res.json({ data: await repository.listInventory() }),
    createInventory: async (req, res) => res.status(201).json({ data: await repository.createInventoryItem({ ...req.body, id: repository.nextId("ING"), updatedAt: new Date().toISOString() }) }),
    updateInventory: async (req, res) => {
      const item = await repository.updateInventoryItem(req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
      if (!item) throw new AppError(404, "Inventory item not found.", "INVENTORY_NOT_FOUND");
      res.json({ data: item });
    },
    adjustInventory: async (req, res) => res.json({ data: await inventoryService.adjust(req.params.id, req.body.quantityChange) }),
    deleteInventory: async (req, res) => {
      if (!await repository.deleteInventoryItem(req.params.id)) throw new AppError(404, "Inventory item not found.", "INVENTORY_NOT_FOUND");
      res.status(204).end();
    },
    orders: async (req, res) => {
      const { status, q } = req.query;
      const data = await repository.listOrders((order) =>
        (!status || order.status === status) &&
        (!q || [order.id, order.customerName, order.customerId].some((value) => String(value).toLowerCase().includes(String(q).toLowerCase()))));
      res.json({ data });
    },
    order: async (req, res) => {
      const order = await repository.getOrder(req.params.id);
      if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
      res.json({ data: order });
    },
    assignOrder: async (req, res) => res.json({ data: await orderService.assign(req.params.id, req.body.riderId, req.user.id) }),
    updateOrderStatus: async (req, res) => res.json({ data: await orderService.adminStatus(req.params.id, req.body.status, req.user.id) }),
    reports: async (req, res) => {
      const period = req.query.period || "day";
      const data = await reportService.sales(period);
      if (!data) throw new AppError(400, "Period must be day, week, or month.", "INVALID_REPORT_PERIOD");
      res.json({ data });
    },
    notifications: async (req, res) => res.json({ data: await notificationService.list() }),
    createNotification: async (req, res) => res.status(201).json({ data: await notificationService.create(req.body.title, req.body.message, req.user.id) }),
    markNotification: async (req, res) => {
      const item = await notificationService.markRead(req.params.id);
      if (!item) throw new AppError(404, "Notification not found.", "NOTIFICATION_NOT_FOUND");
      res.json({ data: item });
    },
    deleteNotification: async (req, res) => {
      if (!await notificationService.delete(req.params.id)) throw new AppError(404, "Notification not found.", "NOTIFICATION_NOT_FOUND");
      res.status(204).end();
    }
  };
}

module.exports = { adminController };
