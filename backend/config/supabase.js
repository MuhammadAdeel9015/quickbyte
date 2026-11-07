const { createClient } = require("@supabase/supabase-js");
const config = require("./env");

function createSupabaseClient({ url = config.supabaseUrl, secretKey = config.supabaseSecretKey } = {}) {
  const missing = [];
  if (!url?.trim()) missing.push("SUPABASE_URL");
  if (!secretKey?.trim()) missing.push("SUPABASE_SECRET_KEY");
  if (missing.length) {
    throw new Error(`${missing.join(" and ")} must be configured when DATA_PROVIDER=supabase or NODE_ENV=production.`);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }

  return createClient(url.trim(), secretKey.trim(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

module.exports = { createSupabaseClient };
