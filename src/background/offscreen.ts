import { initDatabaseAndMigrate } from "./db/db";
import { createOffscreenListener } from "./messages/messageReciever";

createOffscreenListener({
  INIT_DB: async () => {
    // TS knows there is no payload here
    await initDatabaseAndMigrate();
    return { success: true };
  },
});
