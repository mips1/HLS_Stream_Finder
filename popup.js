const extensionApi = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
  const statusEl = document.getElementById('status');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');

  // Listen for live progress updates from content.js
  extensionApi.runtime.onMessage.addListener((message) => {
    if (message.action === "downloadProgress") {
      statusEl.textContent = `Downloading segment ${message.current} of ${message.total}...`;
    } else if (message.action === "downloadMerging") {
      statusEl.textContent = "Merging segments into MP4 file...";
    } else if (message.action === "downloadComplete") {
      statusEl.textContent = "Download complete!";
      if (downloadBtn) downloadBtn.disabled = false;
    } else if (message.action === "downloadError") {
      statusEl.textContent = message.message || "Download failed.";
      if (downloadBtn) downloadBtn.disabled = false;
    }
  });

  extensionApi.storage.local.get([`stream_${tab.id}`, `segments_${tab.id}`], (result) => {
    const streamUrl = result[`stream_${tab.id}`];
    const segments = result[`segments_${tab.id}`];

    if (streamUrl && segments && segments.length > 0) {
      statusEl.textContent = `Detected stream (${segments.length} segments ready).`;

      if (downloadBtn) downloadBtn.disabled = false;
      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.style.cursor = "pointer";
      }

      if (downloadBtn) {
        downloadBtn.onclick = () => {
          downloadBtn.disabled = true;
          statusEl.textContent = `Starting download (0 of ${segments.length})...`;
          
          extensionApi.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            extensionApi.tabs.sendMessage(tab.id, { action: "startDownload", segments: segments });
          });
        };
      }

      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(streamUrl).then(() => {
            const origText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = origText; }, 2000);
          });
        };
      }
    } else {
      statusEl.textContent = "No stream detected on this page yet. Play the video to detect sources.";
      if (downloadBtn) downloadBtn.disabled = true;
      if (copyBtn) {
        copyBtn.disabled = true;
        copyBtn.style.cursor = "not-allowed";
      }
    }
  });
});