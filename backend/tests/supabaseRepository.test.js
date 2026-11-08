const { test } = require("node:test");
const assert = require("node:assert/strict");
const { AppError } = require("../utils/errors");
const { SupabaseRepository } = require("../data/supabaseRepository");

class MockQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.operation = "select";
    this.filters = [];
  }

  select(columns) { this.columns = columns; return this; }
  insert(values) { this.operation = "insert"; this.values = values; return this; }
  update(values) { this.operation = "update"; this.values = values; return this; }
  delete() { this.operation = "delete"; return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  or(filters) { this.filters.push(["or", filters]); return this; }
  in(column, values) { this.filters.push([column, values]); return this; }
  order(column, options) { this.orderBy = [column, options]; return this; }
  maybeSingle() { return this.execute(true); }
  single() { return this.execute(true); }
  execute(single) { return Promise.resolve(this.client.resolve(this, single)); }
  then(resolve, reject) { return this.execute(false).then(resolve, reject); }
}

function mockClient(resolve) {
  return {
    queries: [],
    rpcCalls: [],
    resolve,
    rpc(name, args) {
      this.rpcCalls.push({ name, args });
      return Promise.resolve(this.resolve({ table: `rpc:${name}`, operation: "rpc", values: args }, true));
    },
    from(table) {
      const query = new MockQuery(this, table);
      this.queries.push(query);
      return query;
    }
  };
}

test("profile fields map to the supplied snake_case columns", async () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    role: "employee",
    access_role: "Manager",
    name: "Test Employee",
    email: "manager@example.test",
    phone: null,
    address: null,
    password_hash: "hashed-password",
    active: true,
    availability: null,
    vehicle: null,
    deliveries: 0,
    job_title: "Manager",
    shift: "Day",
    status: "Active",
    joined: "2026-01-01",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null
  };
  const client = mockClient((query) => ({
    data: query.table === "profiles" && query.operation === "insert" ? query.values : query.table === "profiles" ? row : null,
    error: null
  }));
  const repository = new SupabaseRepository(client);

  const created = await repository.createUser({
    id: row.id,
    role: "employee",
    accessRole: "Manager",
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    jobTitle: "Manager",
    deliveries: 0,
    createdAt: row.created_at
  });
  const user = await repository.getUserById(row.id);

  assert.equal(created.accessRole, "Manager");
  assert.equal(created.passwordHash, row.password_hash);
  assert.equal(user.accessRole, "Manager");
  assert.equal(user.passwordHash, "hashed-password");
  assert.equal(user.jobTitle, "Manager");
  assert.equal(user.createdAt, row.created_at);
  assert.equal(user.phone, null);
  assert.deepEqual(client.queries[1].filters, [["id", row.id]]);
  assert.equal(client.queries[0].values.access_role, "Manager");
  assert.equal(client.queries[0].values.password_hash, row.password_hash);
  assert.equal(client.queries[0].values.job_title, "Manager");
});

test("menu prices and order numerics are returned as numbers; identity child IDs are database generated", async () => {
  const orderRow = {
    id: "00000000-0000-4000-8000-000000000002",
    customer_id: "00000000-0000-4000-8000-000000000003",
    customer_name: "Test Customer",
    customer_phone: null,
    delivery_address: "1 Test Street",
    total: "29.00",
    status: "Pending",
    rider_id: null,
    payment_method: "Cash",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z"
  };
  const client = mockClient((query, single) => {
    if (query.table === "menu_items") return { data: { id: "menu-1", name: "Meal", category: "Lunch", price: "14.50", description: "", image: null, available: true }, error: null };
    if (query.table === "rpc:quickbite_create_order_atomic") return { data: orderRow.id, error: null };
    if (query.table === "orders") return { data: orderRow, error: null };
    if (query.table === "order_items" && query.operation === "select") {
      return { data: [{ id: 21, order_id: orderRow.id, menu_item_id: "menu-1", name: "Meal", quantity: 2, unit_price: "14.50", line_total: "29.00" }], error: null };
    }
    if (query.table === "order_status_history" && query.operation === "select") {
      return { data: [{ id: 31, order_id: orderRow.id, status: "Pending", at: orderRow.created_at, by_user_id: orderRow.customer_id }], error: null };
    }
    return { data: null, error: null };
  });
  const repository = new SupabaseRepository(client);

  const menuItem = await repository.getMenuItem("menu-1");
  const order = await repository.createOrder({
    id: orderRow.id,
    customerId: orderRow.customer_id,
    customerName: orderRow.customer_name,
    customerPhone: "",
    deliveryAddress: orderRow.delivery_address,
    total: 29,
    status: "Pending",
    riderId: null,
    paymentMethod: "Cash",
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
    items: [{ menuItemId: "menu-1", name: "Meal", quantity: 2, unitPrice: 14.5, lineTotal: 29 }],
    statusHistory: [{ status: "Pending", at: orderRow.created_at, by: orderRow.customer_id }]
  });

  assert.equal(menuItem.price, 14.5);
  assert.equal(order.total, 29);
  assert.equal(order.items[0].unitPrice, 14.5);
  assert.equal(order.statusHistory[0].by, orderRow.customer_id);
  assert.equal(client.rpcCalls.length, 1);
  assert.equal(client.rpcCalls[0].name, "quickbite_create_order_atomic");
  assert.deepEqual(client.rpcCalls[0].args.p_items, [{
    menu_item_id: "menu-1", name: "Meal", quantity: 2, unit_price: 14.5, line_total: 29
  }]);
  assert.deepEqual(client.rpcCalls[0].args.p_status_history, [{
    status: "Pending", at: orderRow.created_at, by_user_id: orderRow.customer_id
  }]);
  assert.equal(client.queries.some((query) => ["orders", "order_items", "order_status_history"].includes(query.table) && query.operation === "insert"), false);
});

test("atomic order RPC failures stop before any follow-up order reads", async () => {
  const client = mockClient((query) => {
    if (query.operation === "rpc") {
      return { data: null, error: { code: "XX000", status: 500, message: "private database detail" } };
    }
    return { data: null, error: null };
  });
  const repository = new SupabaseRepository(client);
  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(repository.createOrder({
      id: "order-1", customerId: "customer-1", customerName: "Customer", customerPhone: "",
      deliveryAddress: "1 Main Street", total: 2, status: "Pending", riderId: null,
      paymentMethod: "Cash", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      items: [{ menuItemId: "menu-1", name: "Meal", quantity: 1, unitPrice: 2, lineTotal: 2 }],
      statusHistory: [{ status: "Pending", at: "2026-01-01T00:00:00Z", by: "customer-1" }]
    }), (error) => error instanceof AppError && error.status === 500 && error.code === "DATABASE_ERROR");
  } finally {
    console.error = originalError;
  }
  assert.equal(client.rpcCalls.length, 1);
  assert.equal(client.queries.length, 0);
});

test("atomic order update RPC includes expected status and only the new history entry", async () => {
  const orderRow = {
    id: "order-2",
    customer_id: "customer-1",
    customer_name: "Customer",
    customer_phone: "",
    delivery_address: "1 Main Street",
    total: "2.00",
    status: "Pending",
    rider_id: null,
    payment_method: "Cash",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z"
  };
  const historyRow = { status: "Pending", at: orderRow.created_at, by_user_id: "customer-1", order_id: orderRow.id };
  const client = mockClient((query) => {
    if (query.table === "orders") return { data: orderRow, error: null };
    if (query.table === "order_items") return { data: [], error: null };
    if (query.table === "order_status_history") return { data: [historyRow], error: null };
    if (query.table === "rpc:quickbite_update_order_atomic") return { data: orderRow.id, error: null };
    return { data: null, error: null };
  });
  const repository = new SupabaseRepository(client);
  const updated = await repository.updateOrder(orderRow.id, {
    status: "Confirmed",
    riderId: null,
    updatedAt: "2026-01-01T00:01:00Z",
    statusHistory: [
      { status: "Pending", at: orderRow.created_at, by: "customer-1" },
      { status: "Confirmed", at: "2026-01-01T00:01:00Z", by: "admin-1" }
    ]
  });

  assert.equal(updated.id, orderRow.id);
  assert.equal(client.rpcCalls.length, 1);
  assert.deepEqual(client.rpcCalls[0], {
    name: "quickbite_update_order_atomic",
    args: {
      p_order_id: orderRow.id,
      p_expected_status: "Pending",
      p_changes: { status: "Confirmed", rider_id: null, updated_at: "2026-01-01T00:01:00Z" },
      p_status_history: [{ status: "Confirmed", at: "2026-01-01T00:01:00Z", by_user_id: "admin-1" }]
    }
  });
});

test("insufficient-stock RPC failures return a safe conflict without exposing database detail", async () => {
  const orderRow = {
    id: "order-3",
    customer_id: "customer-1",
    customer_name: "Customer",
    customer_phone: "",
    delivery_address: "1 Main Street",
    total: "2.00",
    status: "Pending",
    rider_id: null,
    payment_method: "Cash",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z"
  };
  const client = mockClient((query) => {
    if (query.operation === "rpc") return { data: null, error: { code: "P0001", status: 400, message: "INSUFFICIENT_STOCK" } };
    if (query.table === "orders") return { data: orderRow, error: null };
    if (query.table === "order_items") return { data: [], error: null };
    if (query.table === "order_status_history") return { data: [], error: null };
    return { data: null, error: null };
  });
  const repository = new SupabaseRepository(client);
  const originalError = console.error;
  const log = [];
  console.error = (...args) => log.push(args);
  try {
    await assert.rejects(repository.updateOrder("order-3", {
      status: "Confirmed",
      updatedAt: "2026-01-01T00:01:00Z",
      statusHistory: [{ status: "Confirmed", at: "2026-01-01T00:01:00Z", by: "admin-1" }]
    }), (error) => error instanceof AppError && error.status === 409 &&
      error.code === "INSUFFICIENT_STOCK" && error.message === "There is not enough inventory to confirm this order.");
  } finally {
    console.error = originalError;
  }
  assert.equal(JSON.stringify(log).includes("INSUFFICIENT_STOCK"), false);
});

test("database failures are logged without raw message and returned as explicit API errors", async () => {
  const client = mockClient(() => ({ data: null, error: { code: "XX000", status: 500, message: "private connection detail" } }));
  const repository = new SupabaseRepository(client);
  const originalError = console.error;
  const log = [];
  console.error = (...args) => log.push(args);

  try {
    await assert.rejects(repository.listMenu(), (error) =>
      error instanceof AppError && error.status === 500 && error.code === "DATABASE_ERROR" &&
      error.message === "A database operation failed.");
  } finally {
    console.error = originalError;
  }

  assert.equal(log.length, 1);
  assert.equal(JSON.stringify(log).includes("private connection detail"), false);
});

test("notifications preserve the API fields and map to the existing database columns", async () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Service update",
    message: "A test notification.",
    is_read: false,
    recipient_user_id: null,
    created_by_user_id: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-01-01T00:00:00Z"
  };
  const client = mockClient((query) => ({
    data: query.operation === "insert" ? { ...query.values, ...row } : row,
    error: null
  }));
  const repository = new SupabaseRepository(client);

  const notification = await repository.createNotification({
    id: row.id,
    title: row.title,
    message: row.message,
    read: false,
    recipientUserId: null,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  });

  assert.deepEqual(notification, {
    id: row.id,
    title: row.title,
    message: row.message,
    read: false,
    recipientUserId: null,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  });
  assert.deepEqual(client.queries[0].values, {
    id: row.id,
    title: row.title,
    message: row.message,
    is_read: false,
    recipient_user_id: null,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at
  });
});

test("rider notification query filters recipient and broadcasts in Supabase", async () => {
  const rows = [
    {
      id: "broadcast",
      title: "Service update",
      message: "For everyone.",
      is_read: false,
      recipient_user_id: null,
      created_by_user_id: "admin-1",
      created_at: "2026-01-02T00:00:00Z"
    },
    {
      id: "rider-only",
      title: "Delivery update",
      message: "For this rider.",
      is_read: false,
      recipient_user_id: "rider-1",
      created_by_user_id: "admin-1",
      created_at: "2026-01-01T00:00:00Z"
    }
  ];
  const client = mockClient(() => ({ data: rows, error: null }));
  const repository = new SupabaseRepository(client);

  const notifications = await repository.listNotificationsForRecipient("rider-1");

  assert.deepEqual(client.queries[0].filters, [
    ["or", 'recipient_user_id.eq."rider-1",recipient_user_id.is.null']
  ]);
  assert.deepEqual(client.queries[0].orderBy, [
    "created_at",
    { ascending: false }
  ]);
  assert.deepEqual(notifications.map((item) => item.id), ["broadcast", "rider-only"]);
});

test("menu categories and inventory use the existing schema and normalize numeric values", async () => {
  const client = mockClient((query) => {
    if (query.table === "menu_categories") {
      return { data: [{ id: 12, name: "Lunch", created_at: "2026-01-01T00:00:00Z" }], error: null };
    }
    if (query.table === "inventory_items") {
      return {
        data: {
          id: "00000000-0000-4000-8000-000000000005",
          name: "Coffee beans",
          category: "Beverage",
          unit: "kg",
          quantity: "8.5",
          minimum: "2",
          supplier: null,
          updated_at: "2026-01-01T00:00:00Z"
        },
        error: null
      };
    }
    return { data: null, error: null };
  });
  const repository = new SupabaseRepository(client);

  assert.deepEqual(await repository.listMenuCategories(), [{ name: "Lunch" }]);
  const inventory = await repository.getInventoryItem("00000000-0000-4000-8000-000000000005");

  assert.equal(inventory.quantity, 8.5);
  assert.equal(inventory.minimum, 2);
  assert.equal(inventory.supplier, null);
  assert.deepEqual(client.queries[0].orderBy, ["name", undefined]);
  assert.deepEqual(client.queries[1].filters, [["id", "00000000-0000-4000-8000-000000000005"]]);
});

test("feedback, shifts, and attendance map CRUD fields to existing schema columns", async () => {
  const feedbackRow = {
    id: 11,
    customer_id: "customer-1",
    order_id: "order-1",
    rating: 5,
    comment: "Great.",
    created_at: "2026-11-07T08:00:00Z"
  };
  const shiftRow = {
    id: 12,
    employee_id: "employee-1",
    shift_name: "Opening",
    starts_at: "2026-11-07T08:00:00Z",
    ends_at: "2026-11-07T16:00:00Z",
    status: "Scheduled",
    created_at: "2026-11-07T00:00:00Z"
  };
  const attendanceRow = {
    id: 13,
    employee_id: "employee-1",
    attendance_date: "2026-11-07",
    check_in: "2026-11-07T08:02:00Z",
    check_out: null,
    status: "Present",
    notes: "",
    created_at: "2026-11-07T00:00:00Z"
  };
  const client = mockClient((query) => {
    const row = { customer_feedback: feedbackRow, employee_shifts: shiftRow, employee_attendance: attendanceRow }[query.table];
    if (query.operation === "delete") return { data: [{ id: row.id }], error: null };
    if (query.operation === "insert") return { data: { ...row, ...query.values }, error: null };
    if (query.operation === "update") return { data: { ...row, ...query.values }, error: null };
    if (query.table === "customer_feedback" && query.orderBy) return { data: [row], error: null };
    return { data: row, error: null };
  });
  const repository = new SupabaseRepository(client);

  const feedback = await repository.createFeedback({
    customerId: "customer-1", orderId: "order-1", rating: 5, comment: "Great."
  });
  assert.equal(feedback.id, 11);
  assert.equal(feedback.customerId, "customer-1");
  assert.equal(feedback.rating, 5);
  assert.deepEqual(client.queries[0].values, {
    customer_id: "customer-1", order_id: "order-1", rating: 5, comment: "Great."
  });
  assert.deepEqual(await repository.listFeedbackForCustomer("customer-1"), [{
    id: 11,
    customerId: "customer-1",
    orderId: "order-1",
    rating: 5,
    comment: "Great.",
    createdAt: "2026-11-07T08:00:00Z"
  }]);
  assert.deepEqual(client.queries[1].filters, [["customer_id", "customer-1"]]);
  assert.equal((await repository.updateFeedback(11, { comment: "Updated." })).comment, "Updated.");
  assert.equal(await repository.deleteFeedback(11), true);

  const shift = await repository.createEmployeeShift({
    employeeId: "employee-1", shiftName: "Opening",
    startsAt: shiftRow.starts_at, endsAt: shiftRow.ends_at, status: "Scheduled"
  });
  assert.equal(shift.shiftName, "Opening");
  assert.deepEqual(client.queries[4].values, {
    employee_id: "employee-1", shift_name: "Opening",
    starts_at: shiftRow.starts_at, ends_at: shiftRow.ends_at, status: "Scheduled"
  });
  assert.equal((await repository.updateEmployeeShift(12, { endsAt: "2026-11-07T17:00:00Z" })).endsAt, "2026-11-07T17:00:00Z");
  assert.equal(await repository.deleteEmployeeShift(12), true);

  const attendance = await repository.createEmployeeAttendance({
    employeeId: "employee-1", attendanceDate: attendanceRow.attendance_date,
    checkIn: attendanceRow.check_in, checkOut: null, status: "Present", notes: ""
  });
  assert.equal(attendance.attendanceDate, "2026-11-07");
  assert.deepEqual(client.queries[7].values, {
    employee_id: "employee-1", attendance_date: "2026-11-07",
    check_in: attendanceRow.check_in, check_out: null, status: "Present", notes: ""
  });
  assert.equal((await repository.updateEmployeeAttendance(13, { status: "Late" })).status, "Late");
  assert.equal(await repository.deleteEmployeeAttendance(13), true);
});

test("Vercel entry point exports the Express app without starting a separate server", async () => {
  const app = require("../app");
  const serverlessApp = require("../api");
  const request = require("supertest");
  assert.equal(typeof app, "function");
  assert.equal(typeof app.createApp, "function");
  assert.strictEqual(serverlessApp, app);
  assert.equal((await request(serverlessApp).get("/health")).status, 200);
});
