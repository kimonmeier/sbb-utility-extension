import { synchronizeTourenForAllEmployees } from "./api/syncLogic";
import { initDatabaseAndMigrate } from "./db/db";
import { createOffscreenListener } from "./messages/messageReciever";

createOffscreenListener({
  INIT_DB: async () => {
    // TS knows there is no payload here
    await initDatabaseAndMigrate();
    return { success: true };
  },
  SYNC_API: async (payload) => {
    console.log("Syncing with API");

    try {
      await synchronizeTourenForAllEmployees(payload.api_token);

      return { success: true };
    } catch (error) {
      console.error("Error during API sync:", error);
      return { success: false, error: String(error) };
    }
  },
});
