const { AppError } = require("../utils/errors");

function validate(schema) {
  return (req, res, next) => {
    const errors = schema(req);
    if (errors.length) return next(new AppError(400, "Request validation failed.", "VALIDATION_ERROR", errors));
    next();
  };
}

module.exports = { validate };
