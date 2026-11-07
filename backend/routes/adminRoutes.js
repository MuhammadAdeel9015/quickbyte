const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminUser, requirePermission } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const asyncHandler = require("../utils/asyncHandler");
const { adminController } = require("../controllers/adminController");
const { AppError } = require("../utils/errors");

function objectBody(req) {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? [] : [{ field: "body", message: "Must be a JSON object." }];
}

function adminRoutes(services) {
  const router = express.Router();
  const controller = adminController(services);
  router.use(authenticate(services.repository), requireAdminUser);

  router.get("/dashboard", requirePermission("dashboard"), asyncHandler(controller.dashboard));

  router.get("/customers", requirePermission("customers"), asyncHandler(controller.customers));
  router.post("/customers", requirePermission("customers"), validate(schemas.customerAdmin), asyncHandler(controller.createCustomer));
  router.patch("/customers/:id", requirePermission("customers"), validate(schemas.customerUpdate), asyncHandler(controller.updateCustomer));
  router.delete("/customers/:id", requirePermission("customers"), asyncHandler(controller.deleteCustomer));

  router.get("/riders", requirePermission("riders"), asyncHandler(controller.riders));
  router.post("/riders", requirePermission("riders"), validate(schemas.rider), asyncHandler(controller.createRider));
  router.patch("/riders/:id", requirePermission("riders"), validate(schemas.riderUpdate), asyncHandler(controller.updateRider));
  router.delete("/riders/:id", requirePermission("riders"), asyncHandler(controller.deleteRider));

  router.get("/employees", requirePermission("employees"), asyncHandler(controller.employees));
  router.post("/employees", requirePermission("employees"), validate(schemas.employee), asyncHandler(controller.createEmployee));
  router.patch("/employees/:id", requirePermission("employees"), validate(schemas.employeeUpdate), asyncHandler(controller.updateEmployee));
  router.delete("/employees/:id", requirePermission("employees"), asyncHandler(controller.deleteEmployee));
  router.get("/employees/:id/shifts", requirePermission("employees"), asyncHandler(controller.employeeShifts));
  router.post("/employees/:id/shifts", requirePermission("employees"), validate(schemas.employeeShift), asyncHandler(controller.createEmployeeShift));
  router.patch("/employees/:id/shifts/:shiftId", requirePermission("employees"), validate(schemas.employeeRecordId("shiftId")), validate(schemas.employeeShiftUpdate), asyncHandler(controller.updateEmployeeShift));
  router.delete("/employees/:id/shifts/:shiftId", requirePermission("employees"), validate(schemas.employeeRecordId("shiftId")), asyncHandler(controller.deleteEmployeeShift));
  router.get("/employees/:id/attendance", requirePermission("employees"), asyncHandler(controller.employeeAttendance));
  router.post("/employees/:id/attendance", requirePermission("employees"), validate(schemas.employeeAttendance), asyncHandler(controller.createEmployeeAttendance));
  router.patch("/employees/:id/attendance/:attendanceId", requirePermission("employees"), validate(schemas.employeeRecordId("attendanceId")), validate(schemas.employeeAttendanceUpdate), asyncHandler(controller.updateEmployeeAttendance));
  router.delete("/employees/:id/attendance/:attendanceId", requirePermission("employees"), validate(schemas.employeeRecordId("attendanceId")), asyncHandler(controller.deleteEmployeeAttendance));

  router.get("/roles", requirePermission("roles"), asyncHandler(controller.roles));
  router.patch("/employees/:id/access-role", requirePermission("roles"), validate((req) => {
    const errors = objectBody(req);
    if (Object.keys(req.body || {}).some((key) => key !== "accessRole")) errors.push({ field: "body", message: "Only accessRole may be changed here." });
    if (!["Super Admin", "Manager", "Staff"].includes(req.body?.accessRole)) errors.push({ field: "accessRole", message: "Unknown access role." });
    return errors;
  }), asyncHandler(controller.assignRole));

  router.get("/menu", requirePermission("menu"), asyncHandler(controller.menu));
  router.post("/menu", requirePermission("menu"), validate(schemas.menuItem), asyncHandler(controller.createMenu));
  router.patch("/menu/:id", requirePermission("menu"), validate(schemas.menuItem), asyncHandler(controller.updateMenu));
  router.delete("/menu/:id", requirePermission("menu"), asyncHandler(controller.deleteMenu));

  router.get("/inventory", requirePermission("inventory"), asyncHandler(controller.inventory));
  router.post("/inventory", requirePermission("inventory"), validate(schemas.inventoryItem), asyncHandler(controller.createInventory));
  router.patch("/inventory/:id", requirePermission("inventory"), validate(schemas.inventoryItem), asyncHandler(controller.updateInventory));
  router.post("/inventory/:id/adjust", requirePermission("inventory"), validate(schemas.inventoryAdjustment), asyncHandler(controller.adjustInventory));
  router.delete("/inventory/:id", requirePermission("inventory"), asyncHandler(controller.deleteInventory));

  router.get("/orders", requirePermission("orders"), asyncHandler(controller.orders));
  router.get("/orders/:id", requirePermission("orders"), asyncHandler(controller.order));
  router.post("/orders/:id/assign", requirePermission("orders"), validate(schemas.orderAssign), asyncHandler(controller.assignOrder));
  router.patch("/orders/:id/status", requirePermission("orders"), validate(schemas.status), asyncHandler(controller.updateOrderStatus));

  router.get("/reports/sales", requirePermission("reports"), asyncHandler(controller.reports));
  router.get("/notifications", requirePermission("notifications"), asyncHandler(controller.notifications));
  router.post("/notifications", requirePermission("notifications"), validate(schemas.notification), asyncHandler(controller.createNotification));
  router.patch("/notifications/:id/read", requirePermission("notifications"), asyncHandler(controller.markNotification));
  router.delete("/notifications/:id", requirePermission("notifications"), asyncHandler(controller.deleteNotification));

  router.use((req, res, next) => next(new AppError(404, "Admin API endpoint not found.", "NOT_FOUND")));
  return router;
}

module.exports = { adminRoutes };
