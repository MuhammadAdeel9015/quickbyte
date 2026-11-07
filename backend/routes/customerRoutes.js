const express = require("express");
const { authenticate, requireRoles } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/schemas");
const asyncHandler = require("../utils/asyncHandler");
const { customerController } = require("../controllers/customerController");

function customerRoutes(services) {
  const router = express.Router();
  const controller = customerController(services);
  router.use(authenticate(services.repository), requireRoles("customer"));
  router.get("/me", asyncHandler(controller.profile));
  router.patch("/me", validate(schemas.profile), asyncHandler(controller.updateProfile));
  router.post("/orders", validate(schemas.createOrder), asyncHandler(controller.createOrder));
  router.get("/orders", asyncHandler(controller.orderHistory));
  router.get("/orders/:id", asyncHandler(controller.orderDetail));
  router.get("/orders/:id/tracking", asyncHandler(controller.tracking));
  router.post("/orders/:id/cancel", asyncHandler(controller.cancelOrder));
  router.get("/feedback", asyncHandler(controller.feedback));
  router.get("/feedback/:feedbackId", validate(schemas.feedbackId), asyncHandler(controller.feedbackDetail));
  router.post("/orders/:id/feedback", validate(schemas.feedback), asyncHandler(controller.createFeedback));
  router.patch("/feedback/:feedbackId", validate(schemas.feedbackId), validate(schemas.feedbackUpdate), asyncHandler(controller.updateFeedback));
  router.delete("/feedback/:feedbackId", validate(schemas.feedbackId), asyncHandler(controller.deleteFeedback));
  return router;
}

module.exports = { customerRoutes };
