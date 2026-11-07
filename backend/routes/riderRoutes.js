const express = require("express");
const { authenticate, requireRoles } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const asyncHandler = require("../utils/asyncHandler");
const { riderController } = require("../controllers/riderController");

function riderRoutes(services) {
  const router = express.Router();
  const controller = riderController(services);
  router.use(authenticate(services.repository), requireRoles("rider"));
  router.get("/me", asyncHandler(controller.profile));
  router.get("/notifications", asyncHandler(controller.notifications));
  router.patch("/me", validate(schemas.profile), asyncHandler(controller.updateProfile));
  router.patch("/availability", validate((req) => req.body && ["Available", "Off duty"].includes(req.body.availability) ? [] : [{ field: "availability", message: "Availability must be Available or Off duty." }]), asyncHandler(controller.setAvailability));
  router.get("/orders/assigned", asyncHandler(controller.assigned));
  router.get("/orders/history", asyncHandler(controller.history));
  router.post("/orders/:id/accept", asyncHandler(controller.accept));
  router.post("/orders/:id/reject", asyncHandler(controller.reject));
  router.patch("/orders/:id/status", validate(schemas.status), asyncHandler(controller.advance));
  router.get("/earnings", asyncHandler(controller.earnings));
  return router;
}

module.exports = { riderRoutes };
