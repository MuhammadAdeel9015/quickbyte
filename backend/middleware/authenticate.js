const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");

function authenticate(repository) {
  return (req, res, next) => {
    const [scheme, token] = String(req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) return next(new AppError(401, "A bearer token is required.", "AUTH_REQUIRED"));
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, {
        issuer: "quickbite-api",
        audience: "quickbite-apps"
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return next(new AppError(401, "The access token is invalid or expired.", "INVALID_TOKEN"));
      }
      return next(error);
    }
    Promise.resolve(repository.getUserById(payload.sub))
      .then((user) => {
        if (!user || !user.active) return next(new AppError(401, "This account is unavailable.", "INVALID_SESSION"));
        req.user = publicUser(user);
        next();
      })
      .catch(next);
  };
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, "You do not have permission to access this resource.", "FORBIDDEN"));
    next();
  };
}

module.exports = { authenticate, requireRoles };
