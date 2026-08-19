import { initDatabaseAndMigrate } from './db/db';

// Listen for commands from the Service Worker
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'INIT_DB') {
    await initDatabaseAndMigrate();
    // Run your migration logic here...
    sendResponse({ success: true });
  }

  if (message.type === 'RUN_API_DIFF') {
    // 1. Fetch API
    // 2. Insert into TEMP table
    // 3. Diff against 100k rows
    // 4. Send results back
    sendResponse({ data: "diff_results" });
  }
  
  return true; // Keeps the message channel open for async responses
});