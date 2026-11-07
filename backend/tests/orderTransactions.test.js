const { beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../app");

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

async function createOrder(customerToken, quantity = 2) {
  const response = await api.post("/api/customers/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ items: [{ menuItemId: "FOOD-015", quantity }], deliveryAddress: "1 Market Street" });
  assert.equal(response.status, 201);
  return response.body.data;
}

function addRecipe({ stock = 24, required = 2 } = {}) {
  const repository = app.locals.repository;
  repository.state.menuItemIngredients.push({
    menuItemId: "FOOD-015",
    inventoryItemId: "ING-021",
    quantityRequired: required
  });
  repository.state.inventory.find((item) => item.id === "ING-021").quantity = stock;
}

test("order confirmation deducts recipe stock and records one transaction per ingredient", async () => {
  addRecipe();
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await createOrder(customerToken, 3);

  const confirmed = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });

  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.status, "Confirmed");
  assert.equal(app.locals.repository.state.inventory.find((item) => item.id === "ING-021").quantity, 18);
  assert.equal(app.locals.repository.state.inventoryTransactions.length, 1);
  assert.deepEqual(app.locals.repository.state.inventoryTransactions[0], {
    inventoryItemId: "ING-021",
    quantityChange: -6,
    quantityAfter: 18,
    reason: "order_confirmation",
    referenceOrderId: order.id,
    actorUserId: "ADM-001",
    createdAt: app.locals.repository.state.inventoryTransactions[0].createdAt
  });
});

test("retrying the same confirmation is idempotent and does not append another history row", async () => {
  addRecipe({ stock: 12, required: 2 });
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await createOrder(customerToken, 2);

  const first = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });
  const retry = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });

  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.status, "Confirmed");
  assert.equal(app.locals.repository.state.inventory.find((item) => item.id === "ING-021").quantity, 8);
  assert.equal(app.locals.repository.state.inventoryTransactions.length, 1);
  assert.equal(retry.body.data.statusHistory.filter((entry) => entry.status === "Confirmed").length, 1);
});

test("insufficient inventory leaves order, history, stock, and transaction log unchanged", async () => {
  addRecipe({ stock: 3, required: 2 });
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await createOrder(customerToken, 2);

  const response = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "INSUFFICIENT_STOCK");
  const storedOrder = await app.locals.repository.getOrder(order.id);
  assert.equal(storedOrder.status, "Pending");
  assert.deepEqual(storedOrder.statusHistory.map((entry) => entry.status), ["Pending"]);
  assert.equal(app.locals.repository.state.inventory.find((item) => item.id === "ING-021").quantity, 3);
  assert.equal(app.locals.repository.state.inventoryTransactions.length, 0);
});

test("insufficient stock on a later recipe line rolls back every earlier stock deduction", async () => {
  const repository = app.locals.repository;
  repository.state.menuItemIngredients.push(
    { menuItemId: "FOOD-015", inventoryItemId: "ING-019", quantityRequired: 1 },
    { menuItemId: "FOOD-015", inventoryItemId: "ING-021", quantityRequired: 2 }
  );
  repository.state.inventory.find((item) => item.id === "ING-019").quantity = 20;
  repository.state.inventory.find((item) => item.id === "ING-021").quantity = 3;
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await createOrder(customerToken, 2);

  const response = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });

  assert.equal(response.status, 409);
  assert.equal(repository.state.inventory.find((item) => item.id === "ING-019").quantity, 20);
  assert.equal(repository.state.inventory.find((item) => item.id === "ING-021").quantity, 3);
  assert.equal(repository.state.inventoryTransactions.length, 0);
  assert.equal((await repository.getOrder(order.id)).status, "Pending");
});

test("order creation failure does not persist an order and status-write failure does not alter stock", async () => {
  addRecipe({ stock: 20, required: 2 });
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const repository = app.locals.repository;

  const createOrderOriginal = repository.createOrder.bind(repository);
  const originalError = console.error;
  console.error = () => {};
  repository.createOrder = () => { throw new Error("simulated atomic create failure"); };
  const failedCreation = await api.post("/api/customers/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ items: [{ menuItemId: "FOOD-015", quantity: 1 }], deliveryAddress: "1 Market Street" });
  repository.createOrder = createOrderOriginal;

  assert.equal(failedCreation.status, 500);
  assert.equal(repository.state.orders.length, 0);

  const order = await createOrder(customerToken, 1);
  const updateOriginal = repository.updateOrder.bind(repository);
  repository.updateOrder = () => { throw new Error("simulated atomic status failure"); };
  const failedConfirmation = await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" });
  repository.updateOrder = updateOriginal;
  console.error = originalError;

  assert.equal(failedConfirmation.status, 500);
  assert.equal((await repository.getOrder(order.id)).status, "Pending");
  assert.equal(repository.state.inventory.find((item) => item.id === "ING-021").quantity, 20);
  assert.equal(repository.state.inventoryTransactions.length, 0);
});

test("orders reject content edits after confirmation and cannot be reassigned to another rider", async () => {
  const customerToken = await login("customer/login", "olivia.bennett@email.test", "CustomerDemo123");
  const adminToken = await login("admin/login", "admin@quickbite.test", "QuickBiteAdmin123");
  const order = await createOrder(customerToken, 1);

  assert.equal((await api.patch(`/api/admin/orders/${order.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`).send({ status: "Confirmed" })).status, 200);
  const assigned = await api.post(`/api/admin/orders/${order.id}/assign`)
    .set("Authorization", `Bearer ${adminToken}`).send({ riderId: "RID-208" });
  assert.equal(assigned.status, 200);

  await assert.rejects(repositoryOrderUpdate(order.id), (error) =>
    error.code === "ORDER_PREPARATION_STARTED");
  await assert.rejects(repositoryRiderReassignment(order.id), (error) =>
    error.code === "RIDER_ALREADY_ASSIGNED");

  async function repositoryOrderUpdate(orderId) {
    return app.locals.repository.updateOrder(orderId, { deliveryAddress: "2 Market Street" });
  }
  async function repositoryRiderReassignment(orderId) {
    return app.locals.repository.updateOrder(orderId, { riderId: "RID-207" });
  }
});
