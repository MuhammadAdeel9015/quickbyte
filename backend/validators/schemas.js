const { bodyObject, requiredString, emailInvalid, phonePattern } = require("./common");

function rejectUnknown(body, allowed) {
  return Object.keys(body).filter((key) => !allowed.includes(key)).map((field) => ({ field, message: "This field is not allowed." }));
}

const schema = {
  customerRegistration(req) {
    const body = req.body || {};
    const errors = [];
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    if (requiredString(body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if (emailInvalid(body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if (typeof body.phone !== "string" || !phonePattern.test(body.phone.trim())) errors.push({ field: "phone", message: "A valid phone number is required." });
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 72) errors.push({ field: "password", message: "Password must be 8–72 characters." });
    if (body.address !== undefined && (typeof body.address !== "string" || body.address.length > 300)) errors.push({ field: "address", message: "Address must be no more than 300 characters." });
    return errors;
  },
  login(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = [];
    if (emailInvalid(req.body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if (typeof req.body.password !== "string" || req.body.password.length < 1 || req.body.password.length > 72) errors.push({ field: "password", message: "Password is required." });
    return errors;
  },
  profile(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["name", "phone", "address"]);
    if ("name" in req.body && requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if ("phone" in req.body && (typeof req.body.phone !== "string" || !phonePattern.test(req.body.phone.trim()))) errors.push({ field: "phone", message: "Phone number is invalid." });
    if ("address" in req.body && (typeof req.body.address !== "string" || req.body.address.length > 300)) errors.push({ field: "address", message: "Address must be no more than 300 characters." });
    if (!Object.keys(req.body).some((key) => ["name", "phone", "address"].includes(key))) errors.push({ field: "body", message: "No editable profile fields were provided." });
    return errors;
  },
  createOrder(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = [];
    if (!Array.isArray(req.body.items) || req.body.items.length < 1 || req.body.items.length > 30) errors.push({ field: "items", message: "Provide between 1 and 30 order items." });
    else req.body.items.forEach((item, index) => {
      if (!item || typeof item.menuItemId !== "string") errors.push({ field: `items.${index}.menuItemId`, message: "Menu item ID is required." });
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) errors.push({ field: `items.${index}.quantity`, message: "Quantity must be an integer from 1 to 50." });
    });
    if (requiredString(req.body, "deliveryAddress", 5, 300)) errors.push({ field: "deliveryAddress", message: "Delivery address must be 5–300 characters." });
    if (req.body.paymentMethod !== undefined && !["Cash", "Online"].includes(req.body.paymentMethod)) errors.push({ field: "paymentMethod", message: "Payment method must be Cash or Online." });
    return errors;
  },
  menuItem(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["name", "category", "price", "description", "image", "available"]);
    if (requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if (requiredString(req.body, "category", 2, 60)) errors.push({ field: "category", message: "Category must be 2–60 characters." });
    if (!Number.isFinite(req.body.price) || req.body.price <= 0) errors.push({ field: "price", message: "Price must be a positive number." });
    if (typeof req.body.description !== "string" || req.body.description.length > 500) errors.push({ field: "description", message: "Description is required and must be at most 500 characters." });
    if (req.body.image !== undefined && (typeof req.body.image !== "string" || req.body.image.length > 1000)) errors.push({ field: "image", message: "Image must be a string up to 1000 characters." });
    if (req.body.available !== undefined && typeof req.body.available !== "boolean") errors.push({ field: "available", message: "Availability must be a boolean." });
    return errors;
  },
  orderAssign(req) {
    if (!bodyObject(req) || typeof req.body.riderId !== "string" || !req.body.riderId) return [{ field: "riderId", message: "Rider ID is required." }];
    return [];
  },
  status(req) {
    if (!bodyObject(req) || typeof req.body.status !== "string") return [{ field: "status", message: "Order status is required." }];
    return [];
  },
  inventoryItem(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["name", "category", "unit", "quantity", "minimum", "supplier"]);
    if (requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if (requiredString(req.body, "category", 2, 60)) errors.push({ field: "category", message: "Category must be 2–60 characters." });
    if (requiredString(req.body, "unit", 1, 30)) errors.push({ field: "unit", message: "Unit is required." });
    if (!Number.isInteger(req.body.quantity) || req.body.quantity < 0) errors.push({ field: "quantity", message: "Quantity must be a non-negative integer." });
    if (!Number.isInteger(req.body.minimum) || req.body.minimum < 0) errors.push({ field: "minimum", message: "Minimum must be a non-negative integer." });
    if (requiredString(req.body, "supplier", 2, 100)) errors.push({ field: "supplier", message: "Supplier is required." });
    return errors;
  },
  inventoryAdjustment(req) {
    if (!bodyObject(req) || !Number.isInteger(req.body.quantityChange) || req.body.quantityChange === 0) return [{ field: "quantityChange", message: "A non-zero integer quantityChange is required." }];
    return [];
  },
  employee(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, req.method === "POST"
      ? ["name", "email", "phone", "jobTitle", "accessRole", "shift", "status", "joined", "password"]
      : ["name", "email", "phone", "jobTitle", "accessRole", "shift", "status", "joined", "active"]);
    if (requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if (emailInvalid(req.body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if (typeof req.body.phone !== "string" || !phonePattern.test(req.body.phone.trim())) errors.push({ field: "phone", message: "A valid phone number is required." });
    if (typeof req.body.jobTitle !== "string" || !req.body.jobTitle.trim()) errors.push({ field: "jobTitle", message: "Job title is required." });
    if (req.body.accessRole && !["Super Admin", "Manager", "Staff"].includes(req.body.accessRole)) errors.push({ field: "accessRole", message: "Unknown access role." });
    if (req.body.shift !== undefined && !["Morning", "Day", "Evening", "Night"].includes(req.body.shift)) errors.push({ field: "shift", message: "Shift must be Morning, Day, Evening, or Night." });
    if (req.body.status !== undefined && !["Active", "On leave", "Inactive"].includes(req.body.status)) errors.push({ field: "status", message: "Employee status is invalid." });
    if (req.body.joined !== undefined && !isDate(req.body.joined)) errors.push({ field: "joined", message: "Join date must use YYYY-MM-DD." });
    if (req.method === "POST" && (typeof req.body.password !== "string" || req.body.password.length < 8 || req.body.password.length > 72)) errors.push({ field: "password", message: "Password must be 8–72 characters." });
    return errors;
  },
  employeeUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const body = req.body;
    const errors = rejectUnknown(body, ["name", "email", "phone", "jobTitle", "accessRole", "shift", "status", "joined", "active"]);
    if (Object.keys(body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    if ("name" in body && requiredString(body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if ("email" in body && emailInvalid(body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if ("phone" in body && (typeof body.phone !== "string" || !phonePattern.test(body.phone.trim()))) errors.push({ field: "phone", message: "A valid phone number is required." });
    if ("jobTitle" in body && (typeof body.jobTitle !== "string" || !body.jobTitle.trim() || body.jobTitle.length > 100)) errors.push({ field: "jobTitle", message: "Job title must be a non-empty string up to 100 characters." });
    if ("accessRole" in body && !["Super Admin", "Manager", "Staff"].includes(body.accessRole)) errors.push({ field: "accessRole", message: "Unknown access role." });
    if ("shift" in body && !["Morning", "Day", "Evening", "Night"].includes(body.shift)) errors.push({ field: "shift", message: "Shift must be Morning, Day, Evening, or Night." });
    if ("status" in body && !["Active", "On leave", "Inactive"].includes(body.status)) errors.push({ field: "status", message: "Employee status is invalid." });
    if ("joined" in body && !isDate(body.joined)) errors.push({ field: "joined", message: "Join date must use YYYY-MM-DD." });
    if ("active" in body && typeof body.active !== "boolean") errors.push({ field: "active", message: "Active must be a boolean." });
    return errors;
  },
  feedbackId(req) {
    return Number.isSafeInteger(Number(req.params.feedbackId)) && Number(req.params.feedbackId) > 0
      ? [] : [{ field: "feedbackId", message: "Feedback ID must be a positive integer." }];
  },
  feedback(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["rating", "comment"]);
    if (!Number.isInteger(req.body.rating) || req.body.rating < 1 || req.body.rating > 5) errors.push({ field: "rating", message: "Rating must be an integer from 1 to 5." });
    if (req.body.comment !== undefined && (typeof req.body.comment !== "string" || req.body.comment.length > 2000)) errors.push({ field: "comment", message: "Comment must be a string up to 2000 characters." });
    return errors;
  },
  feedbackUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["rating", "comment"]);
    if (Object.keys(req.body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    if ("rating" in req.body && (!Number.isInteger(req.body.rating) || req.body.rating < 1 || req.body.rating > 5)) errors.push({ field: "rating", message: "Rating must be an integer from 1 to 5." });
    if ("comment" in req.body && (typeof req.body.comment !== "string" || req.body.comment.length > 2000)) errors.push({ field: "comment", message: "Comment must be a string up to 2000 characters." });
    return errors;
  },
  employeeRecordId(parameter) {
    return (req) => Number.isSafeInteger(Number(req.params[parameter])) && Number(req.params[parameter]) > 0
      ? [] : [{ field: parameter, message: `${parameter} must be a positive integer.` }];
  },
  employeeShift(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["shiftName", "startsAt", "endsAt", "status"]);
    if (requiredString(req.body, "shiftName", 1, 100)) errors.push({ field: "shiftName", message: "Shift name is required and must be at most 100 characters." });
    if (!isTimestamp(req.body.startsAt)) errors.push({ field: "startsAt", message: "A valid ISO timestamp is required." });
    if (!isTimestamp(req.body.endsAt)) errors.push({ field: "endsAt", message: "A valid ISO timestamp is required." });
    if (isTimestamp(req.body.startsAt) && isTimestamp(req.body.endsAt) && Date.parse(req.body.startsAt) >= Date.parse(req.body.endsAt)) {
      errors.push({ field: "endsAt", message: "Shift end must be later than shift start." });
    }
    if (req.body.status !== undefined && !["Scheduled", "Completed", "Cancelled"].includes(req.body.status)) errors.push({ field: "status", message: "Shift status must be Scheduled, Completed, or Cancelled." });
    return errors;
  },
  employeeShiftUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["shiftName", "startsAt", "endsAt", "status"]);
    if (Object.keys(req.body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    if ("shiftName" in req.body && requiredString(req.body, "shiftName", 1, 100)) errors.push({ field: "shiftName", message: "Shift name is required and must be at most 100 characters." });
    if ("startsAt" in req.body && !isTimestamp(req.body.startsAt)) errors.push({ field: "startsAt", message: "A valid ISO timestamp is required." });
    if ("endsAt" in req.body && !isTimestamp(req.body.endsAt)) errors.push({ field: "endsAt", message: "A valid ISO timestamp is required." });
    if ("status" in req.body && !["Scheduled", "Completed", "Cancelled"].includes(req.body.status)) errors.push({ field: "status", message: "Shift status must be Scheduled, Completed, or Cancelled." });
    if (isTimestamp(req.body.startsAt) && isTimestamp(req.body.endsAt) && Date.parse(req.body.startsAt) >= Date.parse(req.body.endsAt)) {
      errors.push({ field: "endsAt", message: "Shift end must be later than shift start." });
    }
    return errors;
  },
  employeeAttendance(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["attendanceDate", "checkIn", "checkOut", "status", "notes"]);
    if (!isDate(req.body.attendanceDate)) errors.push({ field: "attendanceDate", message: "Attendance date must use YYYY-MM-DD." });
    if (req.body.checkIn !== undefined && req.body.checkIn !== null && !isTimestamp(req.body.checkIn)) errors.push({ field: "checkIn", message: "Check-in must be a valid ISO timestamp." });
    if (req.body.checkOut !== undefined && req.body.checkOut !== null && !isTimestamp(req.body.checkOut)) errors.push({ field: "checkOut", message: "Check-out must be a valid ISO timestamp." });
    if (req.body.status !== undefined && !["Present", "Absent", "Late", "On leave"].includes(req.body.status)) errors.push({ field: "status", message: "Attendance status is invalid." });
    if (req.body.notes !== undefined && (typeof req.body.notes !== "string" || req.body.notes.length > 1000)) errors.push({ field: "notes", message: "Notes must be a string up to 1000 characters." });
    return errors;
  },
  employeeAttendanceUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["attendanceDate", "checkIn", "checkOut", "status", "notes"]);
    if (Object.keys(req.body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    if ("attendanceDate" in req.body && !isDate(req.body.attendanceDate)) errors.push({ field: "attendanceDate", message: "Attendance date must use YYYY-MM-DD." });
    if ("checkIn" in req.body && req.body.checkIn !== null && !isTimestamp(req.body.checkIn)) errors.push({ field: "checkIn", message: "Check-in must be a valid ISO timestamp." });
    if ("checkOut" in req.body && req.body.checkOut !== null && !isTimestamp(req.body.checkOut)) errors.push({ field: "checkOut", message: "Check-out must be a valid ISO timestamp." });
    if ("status" in req.body && !["Present", "Absent", "Late", "On leave"].includes(req.body.status)) errors.push({ field: "status", message: "Attendance status is invalid." });
    if ("notes" in req.body && (typeof req.body.notes !== "string" || req.body.notes.length > 1000)) errors.push({ field: "notes", message: "Notes must be a string up to 1000 characters." });
    return errors;
  },
  rider(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, req.method === "POST"
      ? ["name", "email", "phone", "vehicle", "password"]
      : ["name", "email", "phone", "vehicle", "availability", "active"]);
    if (requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if (emailInvalid(req.body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if (typeof req.body.phone !== "string" || !phonePattern.test(req.body.phone.trim())) errors.push({ field: "phone", message: "A valid phone number is required." });
    if (req.method === "POST" && (typeof req.body.password !== "string" || req.body.password.length < 8 || req.body.password.length > 72)) errors.push({ field: "password", message: "Password must be 8–72 characters." });
    if (req.body.vehicle !== undefined && !["E-bike", "Scooter", "Bicycle", "Car"].includes(req.body.vehicle)) errors.push({ field: "vehicle", message: "Vehicle type is invalid." });
    return errors;
  },
  customerAdmin(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body || {}, ["name", "email", "phone", "password", "address", "status"]);
    errors.push(...schema.customerRegistration(req));
    if (req.body.status !== undefined && !["Active", "Inactive"].includes(req.body.status)) errors.push({ field: "status", message: "Status must be Active or Inactive." });
    return errors;
  },
  customerUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["name", "email", "phone", "address", "active"]);
    if ("name" in req.body && requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if ("email" in req.body && emailInvalid(req.body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if ("phone" in req.body && (typeof req.body.phone !== "string" || !phonePattern.test(req.body.phone.trim()))) errors.push({ field: "phone", message: "Phone number is invalid." });
    if ("active" in req.body && typeof req.body.active !== "boolean") errors.push({ field: "active", message: "Active must be a boolean." });
    if (Object.keys(req.body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    return errors;
  },
  riderUpdate(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["availability", "active", "name", "phone", "email", "vehicle"]);
    if ("availability" in req.body && !["Available", "Off duty"].includes(req.body.availability)) errors.push({ field: "availability", message: "Availability must be Available or Off duty." });
    if ("active" in req.body && typeof req.body.active !== "boolean") errors.push({ field: "active", message: "Active must be a boolean." });
    if ("name" in req.body && requiredString(req.body, "name", 2, 100)) errors.push({ field: "name", message: "Name must be 2–100 characters." });
    if ("email" in req.body && emailInvalid(req.body.email)) errors.push({ field: "email", message: "A valid email is required." });
    if ("phone" in req.body && (typeof req.body.phone !== "string" || !phonePattern.test(req.body.phone.trim()))) errors.push({ field: "phone", message: "Phone number is invalid." });
    if ("vehicle" in req.body && !["E-bike", "Scooter", "Bicycle", "Car"].includes(req.body.vehicle)) errors.push({ field: "vehicle", message: "Vehicle type is invalid." });
    if (Object.keys(req.body).length === 0) errors.push({ field: "body", message: "Provide at least one field to update." });
    return errors;
  },
  notification(req) {
    if (!bodyObject(req)) return [{ field: "body", message: "Must be a JSON object." }];
    const errors = rejectUnknown(req.body, ["title", "message"]);
    if (requiredString(req.body, "title", 2, 120)) errors.push({ field: "title", message: "Title must be 2–120 characters." });
    if (requiredString(req.body, "message", 2, 500)) errors.push({ field: "message", message: "Message must be 2–500 characters." });
    return errors;
  }
};

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isTimestamp(value) {
  if (typeof value !== "string") return false;
  const date = value.match(/^(\d{4}-\d\d-\d\d)T/);
  return Boolean(date && isDate(date[1]) && Number.isFinite(Date.parse(value)) &&
    /T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(value));
}

module.exports = schema;
