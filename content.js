(function () {
  if (window.hlsDownloaderInjected) return;
  window.hlsDownloaderInjected = true;

  const extensionApi = typeof browser !== "undefined" ? browser : chrome;

  extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startDownload" && request.segments) {
      downloadSegments(request.segments);
    }
  });

  async function downloadSegments(segments) {
    const total = segments.length;
    const blobs = [];

    for (let i = 0; i < total; i++) {
      try {
        const response = await fetch(segments[i]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        blobs.push(blob);

        // Report progress back to popup
        extensionApi.runtime.sendMessage({
          action: "downloadProgress",
          current: i + 1,
          total: total
        }).catch(() => {}); // Ignore error if popup closes during download
      } catch (err) {
        console.error(`[HLS Downloader] Failed segment ${i + 1}:`, err);
      }
    }

    if (blobs.length === 0) {
      extensionApi.runtime.sendMessage({ action: "downloadError", message: "Failed to download segments." }).catch(() => {});
      return;
    }

    // Report merging phase
    extensionApi.runtime.sendMessage({ action: "downloadMerging" }).catch(() => {});

    const finalBlob = new Blob(blobs, { type: 'video/mp4' });
    const downloadUrl = URL.createObjectURL(finalBlob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `video_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    extensionApi.runtime.sendMessage({ action: "downloadComplete" }).catch(() => {});
  }
})();