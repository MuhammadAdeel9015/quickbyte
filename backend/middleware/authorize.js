const { AppError } = require("../utils/errors");

const rolePermissions = Object.freeze({
  "Super Admin": new Set(["dashboard", "orders", "customers", "riders", "employees", "roles", "menu", "inventory", "reports", "notifications"]),
  Manager: new Set(["dashboard", "orders", "customers", "riders", "menu", "inventory", "reports", "notifications"]),
  Staff: new Set(["dashboard", "orders", "menu", "inventory"])
});

function requireAdminUser(req, res, next) {
  if (!req.user || !["admin", "employee"].includes(req.user.role)) return next(new AppError(403, "Administrator access is required.", "FORBIDDEN"));
  next();
}

function requirePermission(resource) {
  return (req, res, next) => {
    if (!req.user || !["admin", "employee"].includes(req.user.role)) return next(new AppError(403, "Administrator access is required.", "FORBIDDEN"));
    if (!rolePermissions[req.user.accessRole]?.has(resource)) return next(new AppError(403, `Your demo role cannot access ${resource}.`, "FORBIDDEN"));
    next();
  };
}

function canAccessRole(accessRole, resource) {
  return Boolean(rolePermissions[accessRole]?.has(resource));
}

module.exports = { rolePermissions, requireAdminUser, requirePermission, canAccessRole };
