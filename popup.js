document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const urlContainer = document.getElementById('urlContainer');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "UPDATE_PROGRESS") {
      statusEl.textContent = `Downloading segment ${message.current} of ${message.total}...`;
    }
  });

  chrome.storage.local.get([`stream_${tab.id}`, "latest_stream"], (result) => {
    const playlistUrl = result[`stream_${tab.id}`] || result["latest_stream"];

    if (playlistUrl) {
      statusEl.textContent = "Stream Playlist Detected:";
      urlContainer.style.display = "block";
      urlContainer.textContent = playlistUrl;

      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(playlistUrl);
        copyBtn.textContent = "Copied to Clipboard!";
        setTimeout(() => copyBtn.textContent = "Copy index.json Link", 2000);
      });

      downloadBtn.addEventListener('click', async () => {
        downloadBtn.disabled = true;
        copyBtn.disabled = true;
        statusEl.textContent = "Injecting downloader into tab...";

        try {
          // Inject content script directly into active tab context
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          statusEl.textContent = "Connecting to video server...";

          chrome.tabs.sendMessage(
            tab.id,
            {
              action: "EXECUTE_DOWNLOAD",
              playlistUrl: playlistUrl,
              pageTitle: tab.title
            },
            (response) => {
              if (response && response.status === "SUCCESS") {
                statusEl.textContent = "Download complete! Saving file...";
              } else {
                statusEl.textContent = `Error: ${response ? response.error : 'Download failed'}`;
              }
              downloadBtn.disabled = false;
              copyBtn.disabled = false;
            }
          );
        } catch (err) {
          statusEl.textContent = `Error injecting script: ${err.message}`;
          downloadBtn.disabled = false;
          copyBtn.disabled = false;
        }
      });
    } else {
      statusEl.textContent = "No stream detected on this page yet. Play the video to detect sources.";
    }
  });
});