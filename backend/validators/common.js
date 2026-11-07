const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()-]{7,20}$/;

function bodyObject(req) {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body);
}

function requiredString(body, name, min = 1, max = 200) {
  return typeof body[name] !== "string" || body[name].trim().length < min || body[name].trim().length > max;
}

function emailInvalid(value) {
  return typeof value !== "string" || value.length > 254 || !emailPattern.test(value.trim());
}

module.exports = { bodyObject, requiredString, emailInvalid, phonePattern };
