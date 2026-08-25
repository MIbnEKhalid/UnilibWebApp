import app from "./app.js";
import config from "./config/index.js";
import cron from "node-cron";
import { initDatabase } from "./db/index.js";
import { syncTasjeel, getLatestSession } from "./services/tasjeel.service.js";

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    await initDatabase();
  } catch (dbErr) {
    console.error("Database initialization failed on startup:", dbErr);
  }

  if (config.nodeEnv !== "development") {
    const cronExpr = config.tasjeelSyncCron;
    console.log(`Scheduling tasjeel sync with cron: ${cronExpr}`);
    try {
      // Run once immediately on startup
      await syncTasjeel(await getLatestSession());

      if (cron.validate(cronExpr)) {
        cron.schedule(cronExpr, async () => {
          try {
            await syncTasjeel(await getLatestSession());
          } catch (err) {
            console.error("Scheduled sync failed:", err);
          }
        });
      } else {
        console.warn("Invalid cron expression for TASJEEL_SYNC_CRON; skipping schedule.");
      }
    } catch (err) {
      console.error("Error initializing tasjeel sync schedule:", err);
    }
  }
});

export default server;
