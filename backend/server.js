const config = require("./config/env");
const { createApp } = require("./app");

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`QuickBite API listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing QuickBite API.`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close the HTTP server cleanly.", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = { server };
