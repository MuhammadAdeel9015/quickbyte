const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { menuController } = require("../controllers/menuController");

function menuRoutes(services) {
  const router = express.Router();
  const controller = menuController(services);
  router.get("/categories", asyncHandler(controller.categories));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.get));
  return router;
}

module.exports = { menuRoutes };
