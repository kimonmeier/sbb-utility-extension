// Ensure only one offscreen document exists
async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run SQLite Wasm database in Web Worker'
  });
}

// Example: Trigger the database init when the extension starts
chrome.runtime.onInstalled.addListener(async () => {
  await setupOffscreenDocument();
  
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'INIT_DB'
  });
  
  console.log("Database initialized in offscreen document:", response);
});