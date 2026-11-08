const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const { MemoryRepository } = require("./data/memoryRepository");
const { SupabaseRepository } = require("./data/supabaseRepository");
const { AuthService } = require("./services/authService");
const { OrderService } = require("./services/orderService");
const { ReportService } = require("./services/reportService");
const { NotificationService } = require("./services/notificationService");
const { InventoryService } = require("./services/inventoryService");
const { CustomerFeedbackService } = require("./services/customerFeedbackService");
const { EmployeeWorkforceService } = require("./services/employeeWorkforceService");
const { apiRoutes } = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

function createApp(options = {}) {
  const useSupabase = config.nodeEnv === "production" || config.storageProvider === "supabase";
  const repository = options.repository || (useSupabase ? new SupabaseRepository() : new MemoryRepository());
  const services = {
    repository,
    authService: new AuthService(repository),
    orderService: new OrderService(repository),
    reportService: new ReportService(repository),
    notificationService: new NotificationService(repository),
    inventoryService: new InventoryService(repository),
    customerFeedbackService: new CustomerFeedbackService(repository),
    employeeWorkforceService: new EmployeeWorkforceService(repository)
  };
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Origin is not allowed by CORS."));
    }
  }));
  app.use(express.json({ limit: "100kb" }));
  app.get("/health", (req, res) => res.json({ status: "ok", mode: repository instanceof MemoryRepository ? "in-memory" : "supabase" }));
  app.use("/api", apiRoutes(services));
  app.use(notFound);
  app.use(errorHandler);
  app.locals.repository = repository;
  app.locals.services = services;
  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
