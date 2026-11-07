const express = require("express");
const { authRoutes } = require("./authRoutes");
const { menuRoutes } = require("./menuRoutes");
const { customerRoutes } = require("./customerRoutes");
const { riderRoutes } = require("./riderRoutes");
const { adminRoutes } = require("./adminRoutes");

function apiRoutes(services) {
  const router = express.Router();
  router.use("/auth", authRoutes(services));
  router.use("/menu", menuRoutes(services));
  router.use("/customers", customerRoutes(services));
  router.use("/rider", riderRoutes(services));
  router.use("/admin", adminRoutes(services));
  return router;
}

module.exports = { apiRoutes };
