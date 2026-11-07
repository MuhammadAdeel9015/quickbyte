const { beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../app");

let api;

beforeEach(() => {
  api = request(createApp());
});

async function login(path, email, password) {
  const response = await api.post(`/api/auth/${path}`).send({ email, password });
  assert.equal(response.status, 200);
  return response.body.data.token;
}

async function makeDeliveredOrder(customerToken) {
  const created = await api.post("/api/customers/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ items: [{ menuItemId: "FOOD-015", quantity: 1 }], deliveryAddress: "1 Market Street", paymentMethod: "Cash" });
  assert.equal(created.status, 201);
  const orderId = created.body.data.id;
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  assert.equal((await api.patch(`/api/admin/orders/${orderId}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" })).status, 200);
  assert.equal((await api.post(`/api/admin/orders/${orderId}/assign`)
    .set("Authorization", `Bearer ${adminToken}`).send({ riderId: "RID-208" })).status, 200);
  const riderToken = await login("rider/login", "daniel.brooks@quickbite.test", "RiderDemo123");
  assert.equal((await api.post(`/api/rider/orders/${orderId}/accept`).set("Authorization", `Bearer ${riderToken}`)).status, 200);
  for (const status of ["Picked Up", "On the Way", "Delivered"]) {
    assert.equal((await api.patch(`/api/rider/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${riderToken}`).send({ status })).status, 200);
  }
  return orderId;
}

test("customer feedback is authenticated, order-owned, delivered-only, and CRUD", async () => {
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const orderResponse = await api.post("/api/customers/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ items: [{ menuItemId: "FOOD-015", quantity: 1 }], deliveryAddress: "1 Market Street" });
  const orderId = orderResponse.body.data.id;

  assert.equal((await api.get("/api/customers/feedback")).status, 401);
  assert.equal((await api.post(`/api/customers/orders/${orderId}/feedback`)
    .set("Authorization", `Bearer ${customerToken}`).send({ rating: 5 })).status, 409);

  const otherRegistration = await api.post("/api/auth/customer/register").send({
    name: "Other Customer", email: "feedback.other@email.test", phone: "+14155550129", password: "Password123"
  });
  const otherToken = otherRegistration.body.data.token;
  const orderIdForOther = await makeDeliveredOrder(otherToken);
  assert.equal((await api.post(`/api/customers/orders/${orderIdForOther}/feedback`)
    .set("Authorization", `Bearer ${customerToken}`).send({ rating: 5 })).status, 404);

  const deliveredOrderId = await makeDeliveredOrder(customerToken);
  assert.equal((await api.post(`/api/customers/orders/${deliveredOrderId}/feedback`)
    .set("Authorization", `Bearer ${customerToken}`).send({ rating: 6 })).status, 400);

  const attempts = await Promise.all([1, 2].map(() => api.post(`/api/customers/orders/${deliveredOrderId}/feedback`)
    .set("Authorization", `Bearer ${customerToken}`).send({ rating: 5, comment: "Great service." })));
  assert.deepEqual(attempts.map((response) => response.status).sort(), [201, 409]);
  const feedback = attempts.find((response) => response.status === 201).body.data;
  assert.equal(feedback.orderId, deliveredOrderId);
  assert.equal(feedback.customerId, "CUS-1042");
  assert.equal(feedback.rating, 5);

  const list = await api.get("/api/customers/feedback").set("Authorization", `Bearer ${customerToken}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal((await api.get(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${customerToken}`)).status, 200);
  assert.equal((await api.get(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${otherToken}`)).status, 404);
  assert.equal((await api.patch(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${otherToken}`).send({ rating: 1 })).status, 404);
  assert.equal((await api.delete(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${otherToken}`)).status, 404);

  const updated = await api.patch(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${customerToken}`).send({ rating: 4 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.rating, 4);
  assert.equal(updated.body.data.comment, "Great service.");
  assert.equal((await api.delete(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${customerToken}`)).status, 204);
  assert.equal((await api.get(`/api/customers/feedback/${feedback.id}`)
    .set("Authorization", `Bearer ${customerToken}`)).status, 404);
});

test("employee profile PATCH accepts partial fields but still rejects invalid or unauthorized updates", async () => {
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const employee = await api.post("/api/admin/employees").set("Authorization", `Bearer ${adminToken}`).send({
    name: "Patch Employee", email: "patch.employee@email.test", phone: "+14155550188",
    jobTitle: "Barista", password: "EmployeeDemo123"
  });
  assert.equal(employee.status, 201);

  const patched = await api.patch(`/api/admin/employees/${employee.body.data.id}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ name: "Renamed Employee" });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.name, "Renamed Employee");
  assert.equal(patched.body.data.jobTitle, "Barista");
  assert.equal((await api.patch(`/api/admin/employees/${employee.body.data.id}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ password: "not-allowed" })).status, 400);
  assert.equal((await api.patch(`/api/admin/employees/${employee.body.data.id}`)
    .set("Authorization", `Bearer ${adminToken}`).send({})).status, 400);
});

test("employee shifts and attendance provide authenticated CRUD with employee scoping", async () => {
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const employeeResponse = await api.post("/api/admin/employees").set("Authorization", `Bearer ${adminToken}`).send({
    name: "Workforce Employee", email: "workforce.employee@email.test", phone: "+14155550187",
    jobTitle: "Barista", password: "EmployeeDemo123"
  });
  const employeeId = employeeResponse.body.data.id;
  const shiftInput = {
    shiftName: "Opening",
    startsAt: "2026-11-07T08:00:00.000Z",
    endsAt: "2026-11-07T16:00:00.000Z"
  };

  assert.equal((await api.get(`/api/admin/employees/${employeeId}/shifts`)).status, 401);
  assert.equal((await api.post(`/api/admin/employees/${employeeId}/shifts`)
    .set("Authorization", `Bearer ${adminToken}`).send({ ...shiftInput, endsAt: shiftInput.startsAt })).status, 400);
  const shiftResponse = await api.post(`/api/admin/employees/${employeeId}/shifts`)
    .set("Authorization", `Bearer ${adminToken}`).send(shiftInput);
  assert.equal(shiftResponse.status, 201);
  assert.equal(shiftResponse.body.data.employeeId, employeeId);
  assert.equal(shiftResponse.body.data.status, "Scheduled");
  const shiftId = shiftResponse.body.data.id;
  assert.equal((await api.get(`/api/admin/employees/${employeeId}/shifts`).set("Authorization", `Bearer ${adminToken}`)).body.data.length, 1);
  assert.equal((await api.get(`/api/admin/employees/EMP-027/shifts`).set("Authorization", `Bearer ${adminToken}`)).body.data.length, 0);
  assert.equal((await api.patch(`/api/admin/employees/EMP-027/shifts/${shiftId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Cancelled" })).status, 404);
  assert.equal((await api.patch(`/api/admin/employees/${employeeId}/shifts/${shiftId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Completed" })).body.data.status, "Completed");
  assert.equal((await api.delete(`/api/admin/employees/${employeeId}/shifts/${shiftId}`)
    .set("Authorization", `Bearer ${adminToken}`)).status, 204);
  assert.equal((await api.delete(`/api/admin/employees/${employeeId}/shifts/${shiftId}`)
    .set("Authorization", `Bearer ${adminToken}`)).status, 404);

  const attendanceResponse = await api.post(`/api/admin/employees/${employeeId}/attendance`)
    .set("Authorization", `Bearer ${adminToken}`).send({
      attendanceDate: "2026-11-07",
      checkIn: "2026-11-07T08:02:00.000Z",
      status: "Present",
      notes: "On time."
    });
  assert.equal(attendanceResponse.status, 201);
  const attendanceId = attendanceResponse.body.data.id;
  assert.equal(attendanceResponse.body.data.employeeId, employeeId);
  assert.equal((await api.get(`/api/admin/employees/EMP-027/attendance`).set("Authorization", `Bearer ${adminToken}`)).body.data.length, 0);
  assert.equal((await api.patch(`/api/admin/employees/EMP-027/attendance/${attendanceId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Absent" })).status, 404);
  assert.equal((await api.patch(`/api/admin/employees/${employeeId}/attendance/${attendanceId}`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Late" })).body.data.status, "Late");
  assert.equal((await api.delete(`/api/admin/employees/${employeeId}/attendance/${attendanceId}`)
    .set("Authorization", `Bearer ${adminToken}`)).status, 204);

  const managerToken = await login("admin/login", "chloe.n@email.test", "ManagerDemo123");
  assert.equal((await api.get(`/api/admin/employees/${employeeId}/shifts`)
    .set("Authorization", `Bearer ${managerToken}`)).status, 403);
});
