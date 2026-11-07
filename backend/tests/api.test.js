const { beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../app");
const { periodBounds } = require("../utils/date");

let app;
let api;

beforeEach(() => {
  app = createApp();
  api = request(app);
});

async function login(path, email, password) {
  const response = await api.post(`/api/auth/${path}`).send({ email, password });
  assert.equal(response.status, 200);
  return response.body.data.token;
}

async function makeOrder(token, menuItemId = "FOOD-015") {
  const response = await api.post("/api/customers/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ menuItemId, quantity: 2 }], deliveryAddress: "1 Market Street, San Francisco", paymentMethod: "Cash" });
  assert.equal(response.status, 201);
  return response.body.data;
}

test("health, customer registration, password login, and protected routes", async () => {
  assert.equal((await api.get("/health")).body.status, "ok");
    const registration = await api.post("/api/auth/customer/register").send({
      name: "Test Customer", email: "test.customer@email.test", phone: "+14155550199", password: "Password123"
    });
    assert.equal(registration.status, 201);
  const token = registration.body.data.token;
  assert.ok(token);
    assert.doesNotMatch(JSON.stringify(registration.body), /password(?:_hash|Hash)/i);
  assert.equal((await api.get("/api/customers/me").set("Authorization", `Bearer ${token}`)).status, 200);
  assert.equal((await api.get("/api/auth/me").set("Authorization", `Bearer ${token}`)).body.data.email, "test.customer@email.test");
  assert.equal((await api.post("/api/auth/logout").set("Authorization", `Bearer ${token}`).send({})).status, 200);
  assert.equal((await api.get("/api/customers/me")).status, 401);
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  assert.equal((await api.post("/api/admin/customers")
    .set("Authorization", `Bearer ${admin}`)
    .send({})).status, 400);
  assert.equal((await api.post("/api/auth/rider/login").send({ email: "olivia.bennett@email.test", password: "CustomerDemo123" })).status, 401);
  assert.equal((await api.post("/api/auth/customer/register").send({ name: "x", email: "bad", password: "short", phone: "" })).status, 400);
});

test("weekly and monthly report windows have exact calendar boundaries", () => {
  const sunday = new Date(2024, 5, 9, 12, 0, 0);
  const week = periodBounds("week", sunday);
  assert.equal(week.start.getDate(), 3);
  assert.equal(week.start.getHours(), 0);
  assert.equal(week.end.getDate(), 9);
  assert.equal(week.end.getHours(), 23);
  const month = periodBounds("month", new Date(2024, 1, 15, 12, 0, 0));
  assert.equal(month.start.getDate(), 1);
  assert.equal(month.end.getDate(), 29);
  assert.equal(periodBounds("year"), null);
});

test("menu retrieval and endpoint role authorization", async () => {
  const menu = await api.get("/api/menu?category=Healthy%20bowls&available=true");
  assert.equal(menu.status, 200);
  assert.equal(menu.body.data.length, 1);
  const customer = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  assert.equal((await api.get("/api/admin/dashboard").set("Authorization", `Bearer ${customer}`)).status, 403);
  const manager = await login("admin/login", "chloe.n@email.test", "ManagerDemo123");
  assert.equal((await api.get("/api/admin/dashboard").set("Authorization", `Bearer ${manager}`)).status, 200);
  assert.equal((await api.get("/api/admin/roles").set("Authorization", `Bearer ${manager}`)).status, 403);
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const roles = await api.get("/api/admin/roles").set("Authorization", `Bearer ${admin}`);
  assert.equal(roles.status, 200);
  assert.deepEqual(roles.body.data.map((role) => role.name), ["Super Admin", "Manager", "Staff"]);
});

test("rider notifications are restricted to the authenticated rider and broadcasts", async () => {
  const riderToken = await login("rider/login", "daniel.brooks@quickbite.test", "RiderDemo123");
  const otherRiderToken = await login("rider/login", "sofia.garcia@quickbite.test", "RiderDemo123");
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const repository = app.locals.repository;
  repository.createNotification({
    id: "NTF-BROADCAST",
    title: "Broadcast",
    message: "Visible to all riders.",
    read: false,
    recipientUserId: null,
    createdByUserId: "ADM-001",
    createdAt: "2026-01-03T00:00:00.000Z"
  });
  repository.createNotification({
    id: "NTF-RIDER-208",
    title: "Private",
    message: "Visible to this rider.",
    read: false,
    recipientUserId: "RID-208",
    createdByUserId: "ADM-001",
    createdAt: "2026-01-02T00:00:00.000Z"
  });
  repository.createNotification({
    id: "NTF-RIDER-207",
    title: "Private",
    message: "Visible to another rider.",
    read: false,
    recipientUserId: "RID-207",
    createdByUserId: "ADM-001",
    createdAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal((await api.get("/api/rider/notifications")).status, 401);
  assert.equal((await api.get("/api/rider/notifications")
    .set("Authorization", `Bearer ${customerToken}`)).status, 403);

  const response = await api.get("/api/rider/notifications?recipientUserId=RID-207")
    .set("Authorization", `Bearer ${riderToken}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.map((item) => item.id), ["NTF-001", "NTF-BROADCAST", "NTF-RIDER-208"]);
  assert.equal(response.body.data[0].read, false);
  assert.equal(response.body.data[0].recipientUserId, undefined);
  assert.equal(response.body.data[0].createdByUserId, undefined);

  const otherRiderResponse = await api.get("/api/rider/notifications")
    .set("Authorization", `Bearer ${otherRiderToken}`);
  assert.deepEqual(otherRiderResponse.body.data.map((item) => item.id), ["NTF-001", "NTF-BROADCAST", "NTF-RIDER-207"]);
});

test("order ownership, confirmation, rider assignment constraints, delivery workflow, and reports", async () => {
  const customer = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const otherRegistration = await api.post("/api/auth/customer/register").send({
    name: "Second Customer", email: "second.customer@email.test", phone: "+14155550198", password: "Password123"
  });
  const other = otherRegistration.body.data.token;
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await makeOrder(customer);
  assert.equal((await api.get(`/api/customers/orders/${order.id}`).set("Authorization", `Bearer ${other}`)).status, 403);

  const confirm = await api.patch(`/api/admin/orders/${order.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Confirmed" });
  assert.equal(confirm.body.data.status, "Confirmed");
  const assigned = await api.post(`/api/admin/orders/${order.id}/assign`).set("Authorization", `Bearer ${admin}`).send({ riderId: "RID-208" });
  assert.equal(assigned.body.data.status, "Assigned");
  assert.equal((await api.patch("/api/admin/riders/RID-208").set("Authorization", `Bearer ${admin}`).send({ availability: "Available" })).status, 409);
  assert.equal((await api.get("/api/admin/dashboard").set("Authorization", `Bearer ${admin}`)).body.data.availableRiders, 1);
  const otherRider = await login("rider/login", "sofia.garcia@quickbite.test", "RiderDemo123");
  assert.equal((await api.post(`/api/rider/orders/${order.id}/accept`).set("Authorization", `Bearer ${otherRider}`)).status, 403);
  const assignedRider = await login("rider/login", "daniel.brooks@quickbite.test", "RiderDemo123");
  assert.equal((await api.patch("/api/rider/availability").set("Authorization", `Bearer ${assignedRider}`).send({ availability: "Available" })).status, 409);

  const secondOrder = await makeOrder(customer, "FOOD-014");
  await api.patch(`/api/admin/orders/${secondOrder.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Confirmed" });
  const busyAssignment = await api.post(`/api/admin/orders/${secondOrder.id}/assign`).set("Authorization", `Bearer ${admin}`).send({ riderId: "RID-208" });
  assert.equal(busyAssignment.status, 409);

  await api.patch("/api/admin/riders/RID-207").set("Authorization", `Bearer ${admin}`).send({ availability: "Off duty" });
  const unavailableAssignment = await api.post(`/api/admin/orders/${secondOrder.id}/assign`).set("Authorization", `Bearer ${admin}`).send({ riderId: "RID-207" });
  assert.equal(unavailableAssignment.status, 409);

  const rider = await login("rider/login", "daniel.brooks@quickbite.test", "RiderDemo123");
  assert.equal((await api.post(`/api/rider/orders/${order.id}/accept`).set("Authorization", `Bearer ${rider}`)).body.data.status, "Accepted");
  for (const status of ["Picked Up", "On the Way", "Delivered"]) {
    const response = await api.patch(`/api/rider/orders/${order.id}/status`).set("Authorization", `Bearer ${rider}`).send({ status });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, status);
  }
  const riders = (await api.get("/api/admin/riders").set("Authorization", `Bearer ${admin}`)).body.data;
  assert.equal(riders.find((item) => item.id === "RID-208").availability, "Available");
  assert.equal((await api.get(`/api/customers/orders/${order.id}/tracking`).set("Authorization", `Bearer ${customer}`)).body.data.status, "Delivered");

  for (const period of ["day", "week", "month"]) {
    const report = await api.get(`/api/admin/reports/sales?period=${period}`).set("Authorization", `Bearer ${admin}`);
    assert.equal(report.status, 200);
    assert.equal(report.body.data.ordersCount, 2);
    assert.equal(report.body.data.revenue, 61);
    assert.ok(report.body.data.bestSellers.some((item) => item.menuItemId === "FOOD-015" && item.quantity === 2));
  }
  assert.equal((await api.get("/api/admin/reports/sales?period=year").set("Authorization", `Bearer ${admin}`)).status, 400);
});

test("cancellation releases assigned rider and off-duty rider cannot be assigned", async () => {
  const customer = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await makeOrder(customer);
  await api.patch(`/api/admin/orders/${order.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Confirmed" });
  await api.post(`/api/admin/orders/${order.id}/assign`).set("Authorization", `Bearer ${admin}`).send({ riderId: "RID-208" });
  const cancelled = await api.patch(`/api/admin/orders/${order.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Cancelled" });
  assert.equal(cancelled.body.data.status, "Cancelled");
  const riders = (await api.get("/api/admin/riders").set("Authorization", `Bearer ${admin}`)).body.data;
  assert.equal(riders.find((item) => item.id === "RID-208").availability, "Available");
  assert.equal((await api.patch(`/api/admin/orders/${order.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Delivered" })).status, 409);

  const rejectedOrder = await makeOrder(customer);
  await api.patch(`/api/admin/orders/${rejectedOrder.id}/status`).set("Authorization", `Bearer ${admin}`).send({ status: "Confirmed" });
  await api.post(`/api/admin/orders/${rejectedOrder.id}/assign`).set("Authorization", `Bearer ${admin}`).send({ riderId: "RID-208" });
  const rider = await login("rider/login", "daniel.brooks@quickbite.test", "RiderDemo123");
  const rejected = await api.post(`/api/rider/orders/${rejectedOrder.id}/reject`).set("Authorization", `Bearer ${rider}`);
  assert.equal(rejected.body.data.status, "Rejected");
  const released = (await api.get("/api/admin/riders").set("Authorization", `Bearer ${admin}`)).body.data;
  assert.equal(released.find((item) => item.id === "RID-208").availability, "Available");
});

test("inventory adjustments, notifications, menu administration, and input validation", async () => {
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const stock = await api.post("/api/admin/inventory/ING-021/adjust").set("Authorization", `Bearer ${admin}`).send({ quantityChange: 3 });
  assert.equal(stock.body.data.quantity, 27);
  assert.equal((await api.post("/api/admin/inventory/ING-021/adjust").set("Authorization", `Bearer ${admin}`).send({ quantityChange: -999 })).status, 400);
  const ingredient = await api.post("/api/admin/inventory").set("Authorization", `Bearer ${admin}`).send({
    name: "Test ingredient", category: "Produce", unit: "kg", quantity: 3, minimum: 1, supplier: "Local supplier"
  });
  assert.equal(ingredient.status, 201);
  assert.equal((await api.patch(`/api/admin/inventory/${ingredient.body.data.id}`).set("Authorization", `Bearer ${admin}`).send({
    name: "Test ingredient", category: "Produce", unit: "kg", quantity: 4, minimum: 1, supplier: "Local supplier"
  })).body.data.quantity, 4);
  assert.equal((await api.delete(`/api/admin/inventory/${ingredient.body.data.id}`).set("Authorization", `Bearer ${admin}`)).status, 204);
  const notification = await api.post("/api/admin/notifications").set("Authorization", `Bearer ${admin}`).send({ title: "Test update", message: "A test notification." });
  assert.equal(notification.status, 201);
  const marked = await api.patch(`/api/admin/notifications/${notification.body.data.id}/read`).set("Authorization", `Bearer ${admin}`);
  assert.equal(marked.body.data.read, true);
  assert.equal((await api.delete(`/api/admin/notifications/${notification.body.data.id}`).set("Authorization", `Bearer ${admin}`)).status, 204);
  const added = await api.post("/api/admin/menu").set("Authorization", `Bearer ${admin}`).send({
    name: "Test Salad", category: "Salads", price: 12, description: "Fresh greens."
  });
  assert.equal(added.status, 201);
  assert.match(added.body.data.id, /^FOOD-/);
  assert.equal((await api.patch(`/api/admin/menu/${added.body.data.id}`).set("Authorization", `Bearer ${admin}`).send({
    name: "Test Salad", category: "Salads", price: 12, description: "Fresh greens.", available: false
  })).body.data.available, false);
  assert.equal((await api.post("/api/admin/menu").set("Authorization", `Bearer ${admin}`).send({
    id: "FAKE", name: "x", category: "Food", price: -1, description: ""
  })).status, 400);
});

test("admin CRUD hashes passwords and refuses unsafe mass assignment", async () => {
  const admin = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const customer = await api.post("/api/admin/customers").set("Authorization", `Bearer ${admin}`).send({
    name: "Managed Customer", email: "managed.customer@email.test", phone: "+14155550177", password: "CustomerDemo123"
  });
  assert.equal(customer.status, 201);
  const changedCustomer = await api.patch(`/api/admin/customers/${customer.body.data.id}`).set("Authorization", `Bearer ${admin}`).send({ name: "Updated Customer" });
  assert.equal(changedCustomer.body.data.name, "Updated Customer");
  assert.equal((await api.delete(`/api/admin/customers/${customer.body.data.id}`).set("Authorization", `Bearer ${admin}`)).status, 204);

  const rider = await api.post("/api/admin/riders").set("Authorization", `Bearer ${admin}`).send({
    name: "Managed Rider", email: "managed.rider@quickbite.test", phone: "+14155550176", password: "RiderDemo123", vehicle: "Bicycle"
  });
  assert.equal(rider.status, 201);
  assert.equal((await api.patch(`/api/admin/riders/${rider.body.data.id}`).set("Authorization", `Bearer ${admin}`).send({ availability: "Off duty" })).body.data.availability, "Off duty");
  assert.equal((await api.delete(`/api/admin/riders/${rider.body.data.id}`).set("Authorization", `Bearer ${admin}`)).status, 204);

  const employee = await api.post("/api/admin/employees").set("Authorization", `Bearer ${admin}`).send({
    name: "New Employee", email: "new.employee@email.test", phone: "+14155550188",
    jobTitle: "Barista", accessRole: "Staff", password: "EmployeeDemo123"
  });
  assert.equal(employee.status, 201);
  assert.equal(employee.body.data.passwordHash, undefined);
  assert.equal(employee.body.data.password, undefined);
  assert.doesNotMatch(JSON.stringify(employee.body), /password(?:_hash|Hash)/i);
  assert.equal(employee.body.data.joined, new Date().toISOString().slice(0, 10));
  assert.equal(employee.body.data.status, "Active");
  assert.equal(employee.body.data.shift, "Day");
  const badProfile = await api.patch(`/api/admin/employees/${employee.body.data.id}`).set("Authorization", `Bearer ${admin}`).send({
    name: "Changed", email: "new.employee@email.test", phone: "+14155550188", jobTitle: "Barista", password: "plain-text"
  });
  assert.equal(badProfile.status, 400);
  const assignedRole = await api.patch(`/api/admin/employees/${employee.body.data.id}/access-role`)
    .set("Authorization", `Bearer ${admin}`).send({ accessRole: "Manager" });
  assert.equal(assignedRole.body.data.accessRole, "Manager");
  assert.equal((await api.delete(`/api/admin/employees/${employee.body.data.id}`).set("Authorization", `Bearer ${admin}`)).status, 204);
});
