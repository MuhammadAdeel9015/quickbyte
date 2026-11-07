const express = require("express");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const { authenticate } = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const { authController } = require("../controllers/authController");

function authRoutes(services) {
  const router = express.Router();
  const controller = authController(services);
  router.post("/customer/register", validate(schemas.customerRegistration), asyncHandler(controller.register));
  router.post("/customer/login", validate(schemas.login), asyncHandler(controller.customerLogin));
  router.post("/rider/login", validate(schemas.login), asyncHandler(controller.riderLogin));
  router.post("/admin/login", validate(schemas.login), asyncHandler(controller.adminLogin));
  router.get("/me", authenticate(services.repository), controller.me);
  router.post("/logout", authenticate(services.repository), controller.logout);
  return router;
}

module.exports = { authRoutes };
