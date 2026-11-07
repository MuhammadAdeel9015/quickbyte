const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../app");

test("Rider Web origin is allowed to preflight rider login", async () => {
  const response = await request(createApp())
    .options("/api/auth/rider/login")
    .set("Origin", "http://localhost:53290")
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "authorization,content-type");

  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], "http://localhost:53290");
  assert.match(response.headers["access-control-allow-methods"], /\bPOST\b/);
  assert.match(response.headers["access-control-allow-headers"], /\bauthorization\b/i);
  assert.match(response.headers["access-control-allow-headers"], /\bcontent-type\b/i);
});
