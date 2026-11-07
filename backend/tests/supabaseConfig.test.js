const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSupabaseClient } = require("../config/supabase");

test("missing Supabase credentials identify required variable names without values", () => {
  assert.throws(() => createSupabaseClient({ url: "", secretKey: "" }), (error) =>
    error.message === "SUPABASE_URL and SUPABASE_SECRET_KEY must be configured when DATA_PROVIDER=supabase or NODE_ENV=production.");
});

test("invalid Supabase URLs are rejected without exposing the secret key", () => {
  const secretKey = `sb_secret_${"a".repeat(32)}`;
  assert.throws(() => createSupabaseClient({ url: "not-a-url", secretKey }), (error) =>
    error.message === "SUPABASE_URL must be a valid HTTP or HTTPS URL." &&
    !error.message.includes(secretKey));
});

test("the Supabase client accepts the new secret key format", () => {
  const client = createSupabaseClient({
    url: "https://quickbite-test.supabase.co",
    secretKey: `sb_secret_${"a".repeat(32)}`
  });

  assert.ok(client);
});
