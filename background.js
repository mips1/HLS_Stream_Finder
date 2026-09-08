const extensionApi = typeof browser !== "undefined" ? browser : chrome;

// Listen to all network requests before headers are sent
extensionApi.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const url = details.url;

    // Pattern 1: Target API endpoints returning sources
    const isApiSource = url.includes('/api/') && (url.includes('/videos/') || url.includes('/episodes/') || url.endsWith('/sources'));
    
    // Pattern 2: Direct HLS manifest files
    const isDirectPlaylist = url.includes('.m3u8') || url.includes('/index.json');

    if (isApiSource || isDirectPlaylist) {
      processStreamUrl(url, details.tabId);
    }
  },
  { urls: ["<all_urls>"] }
);

async function processStreamUrl(url, tabId) {
  if (tabId < 0) return;

  let finalPlaylistUrl = url;

  // If it's an API endpoint, attempt to fetch the JSON structure quietly
  if (url.includes('/api/')) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let hlsBase = null;

        if (typeof data === 'string') {
          const match = data.match(/https:\/\/[^"]+/);
          if (match) hlsBase = match[0];
        } else if (data && data.url) {
          hlsBase = data.url;
        }

        if (hlsBase) {
          finalPlaylistUrl = hlsBase.endsWith('/index.json') || hlsBase.endsWith('.m3u8') 
            ? hlsBase 
            : `${hlsBase.replace(/\/$/, '')}/index.json`;
        }
      }
    } catch (err) {
      // Fall back to raw URL if JSON parsing fails
    }
  }

  // Save detected stream URL to storage
  await extensionApi.storage.local.set({ 
    [`stream_${tabId}`]: finalPlaylistUrl, 
    "latest_stream": finalPlaylistUrl 
  });
  
  setReadyBadge(tabId);
}

// Re-apply badge on tab refresh
extensionApi.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    extensionApi.storage.local.get([`stream_${tabId}`], (result) => {
      if (result[`stream_${tabId}`]) {
        setReadyBadge(tabId);
      }
    });
  }
});

function setReadyBadge(tabId) {
  extensionApi.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10B981" });
  extensionApi.action.setBadgeText({ tabId: tabId, text: "READY" });
}