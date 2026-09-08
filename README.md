# HLS Stream Finder & Downloader

A lightweight, high-performance browser extension (compatible with Microsoft Edge, Google Chrome, and Brave) designed to automatically detect, parse, and download HLS (`.m3u8` and `.json`) video streams. 

It intercepts stream manifests in the background, bypasses cross-origin (CORS) restrictions, and stitches segment blobs directly in the browser into a standalone `.mp4` video file.

---

## Features

- 🎯 **Automatic Detection**: Captures HLS playlists (`.m3u8` and `/index.json` manifests) as soon as media playback starts.
- ⚡ **CORS Bypass**: Background service worker parsing prevents CORS blocking and console syntax errors.
- 📊 **Real-time Progress Tracker**: Displays segment-by-segment fetch progress (`Downloading segment X of Y...`) inside the extension popup menu.
- 🔗 **Direct URL Copying**: Copy stream manifest URLs with a single click.
- 🧩 **Zero Dependencies**: Pure vanilla JavaScript implementation—no external libraries, python backends, or FFmpeg required.

---

## File Architecture

```text
HLS_Stream_Finder/
├── manifest.json   # Extension metadata, permissions, and service worker registration
├── background.js   # Background service worker for request listening & CORS-free parsing
├── content.js      # Injected script handling segment downloads, blob creation, & assembly
├── popup.html      # Compact extension UI layout
└── popup.js        # UI controller & message bridge between content script and popup
```

---

## Installation Guide

### Prerequisites
- Any Chromium-based browser (**Microsoft Edge**, **Google Chrome**, **Brave**, or **Opera**).

### Option A: Load from Local Directory
1. Open your browser and navigate to the Extensions management page:
   - **Microsoft Edge**: `edge://extensions`
   - **Google Chrome**: `chrome://extensions`
2. Enable **Developer mode** using the toggle switch (usually in the top-right or left sidebar).
3. Click the **Load unpacked** button.
4. Select the `HLS_Stream_Finder` project directory on your machine.

### Option B: Fresh Clone via Terminal
```bash
# Clone repository
git clone https://github.com/mips1/HLS_Stream_Finder.git

# Navigate to your browser's extension page (edge://extensions or chrome://extensions)
# Click "Load unpacked" and choose the cloned folder path.
```

---

## How to Use

1. **Navigate to Video Page**: Open any website hosting an HLS video stream.
2. **Start Playback**: Press **Play** on the video player.
3. **Check Badge**: The extension icon will display a green **`READY`** badge once a stream manifest is captured.
4. **Download**:
   - Click the extension icon in your toolbar.
   - Click **Download Video** to start fetching segments.
   - Observe real-time progress (`Downloading segment 45 of 1372...`).
   - The stitched `.mp4` file will automatically prompt to save upon completion.
5. **Copy Link**: Click **Copy Stream Link** if you prefer to copy the raw manifest URL.

---

## Troubleshooting

- **Badge not showing `READY`?** 
  Perform a hard refresh (**Ctrl + Shift + R**) on the video tab and press **Play** again to re-trigger the network request.
- **Interrupted download?**
  Keep the video tab open while downloading so the content script can construct the blob cleanly.

---

## License

MIT License. Free to use, modify, and distribute.
