const { AppError } = require("../utils/errors");

function notFound(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found.`, "NOT_FOUND"));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: status >= 500 && process.env.NODE_ENV === "production" ? "An unexpected server error occurred." : error.message,
      ...(error.details ? { details: error.details } : {})
    }
  });
}

module.exports = { notFound, errorHandler };
