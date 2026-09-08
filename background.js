const extensionApi = typeof browser !== "undefined" ? browser : chrome;

extensionApi.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;

    if (url.includes('.json') || url.includes('.m3u8') || url.includes('sources') || url.includes('/api/')) {
      processStreamUrl(url, details.tabId);
    }
  },
  { urls: ["<all_urls>"] }
);

async function processStreamUrl(url, tabId) {
  if (tabId < 0) return;

  let playlistUrl = url;

  if (url.includes('/api/')) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.url) playlistUrl = data.url;
      else if (typeof data === 'string' && data.includes('http')) {
        const match = data.match(/https?:\/\/[^"]+/);
        if (match) playlistUrl = match[0];
      }
    } catch (e) {
      console.warn("API parse bypass, using raw URL:", e);
    }
  }

  try {
    const response = await fetch(playlistUrl);
    if (!response.ok) return;

    const text = await response.text();
    let segments = [];
    const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);
    const trimmedText = text.trim();

    // Check manifest format explicitly before parsing
    if (trimmedText.startsWith('{') || (playlistUrl.endsWith('.json') && !trimmedText.startsWith('#EXTM3U'))) {
      const jsonData = JSON.parse(trimmedText);
      if (jsonData.segments) {
        segments = jsonData.segments.map(s => s.url.startsWith('http') ? s.url : baseUrl + s.url);
      }
    } else if (trimmedText.startsWith('#EXTM3U') || playlistUrl.endsWith('.m3u8')) {
      const lines = trimmedText.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          segments.push(line.startsWith('http') ? line : baseUrl + line);
        }
      }
    }

    if (segments.length > 0) {
      await extensionApi.storage.local.set({
        [`stream_${tabId}`]: playlistUrl,
        [`segments_${tabId}`]: segments
      });
      setReadyBadge(tabId);
      console.log(`[HLS Interceptor Success]: Captured ${segments.length} segments for tab ${tabId}`);
    }
  } catch (err) {
    console.error("Error processing stream URL:", err);
  }
}

function setReadyBadge(tabId) {
  extensionApi.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10B981" });
  extensionApi.action.setBadgeText({ tabId: tabId, text: "READY" });
}