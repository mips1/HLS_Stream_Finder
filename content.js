chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "EXECUTE_DOWNLOAD") {
    downloadAndStitch(message.playlistUrl, message.pageTitle)
      .then(() => sendResponse({ status: "SUCCESS" }))
      .catch((err) => sendResponse({ status: "ERROR", error: err.message }));
    return true;
  }
});

async function downloadAndStitch(playlistUrl, pageTitle) {
  const manifestRes = await fetch(playlistUrl);
  if (!manifestRes.ok) throw new Error("Could not access stream playlist.");
  
  const manifestText = await manifestRes.text();
  let segmentUrls = [];
  const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);

  if (manifestText.trim().startsWith('{') || manifestText.trim().startsWith('[')) {
    const manifestData = JSON.parse(manifestText);
    if (Array.isArray(manifestData.segments)) {
      segmentUrls = manifestData.segments.map(s => s.url.startsWith('http') ? s.url : baseUrl + s.url);
    } else if (manifestData.urls) {
      segmentUrls = manifestData.urls.map(u => u.startsWith('http') ? u : baseUrl + u);
    }
  } else {
    const lines = manifestText.split('\n');
    segmentUrls = lines
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.startsWith('http') ? line : baseUrl + line);
  }

  if (segmentUrls.length === 0) {
    throw new Error("No media segments found in manifest.");
  }

  const chunks = [];
  for (let i = 0; i < segmentUrls.length; i++) {
    chrome.runtime.sendMessage({
      action: "UPDATE_PROGRESS",
      current: i + 1,
      total: segmentUrls.length
    }).catch(() => {});

    const segRes = await fetch(segmentUrls[i]);
    if (!segRes.ok) throw new Error(`Failed to download segment ${i + 1}`);

    const segBuffer = await segRes.arrayBuffer();
    chunks.push(segBuffer);
  }

  // Generate downloadable Blob inside page context
  const mergedBlob = new Blob(chunks, { type: 'video/mp4' });
  const blobUrl = URL.createObjectURL(mergedBlob);
  const cleanTitle = pageTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  
  // Trigger DOM link click save directly
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${cleanTitle || 'stream_video'}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}