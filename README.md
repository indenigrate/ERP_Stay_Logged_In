# IIT KGP ERP - Stay Logged In (Chrome Extension)

A lightweight, privacy-friendly Manifest V3 browser extension for the **IIT Kharagpur ERP portal (`erp.iitkgp.ac.in`)** that prevents unexpected session timeouts and automatically dismisses the 10-minute timeout warning modal.

---

## 🔍 How to Find Out What the Popup Does

When you're logged into the ERP portal and the 10-minute session warning popup appears, here is how you can find out exactly what it does behind the scenes using **Chrome DevTools**:

### Method 1: Check Network Traffic (What request is sent when clicked?)
1. Open ERP (`erp.iitkgp.ac.in`) and press `F12` (or right-click anywhere & select **Inspect**) to open DevTools.
2. Go to the **Network** tab.
3. Check **"Preserve log"** and select the **"Fetch/XHR"** filter.
4. When the timeout popup appears, click the reset/extend button.
5. Look at the new request that appears in the list:
   - **Request URL**: Notice what endpoint is hit (e.g. `/IIT_ERP3/`, `keepAlive.htm`, or similar).
   - **Status**: Look for HTTP 200 OK.
   - **Cookies**: In the **Headers** tab, you will see `JSESSIONID` passed along. Any valid request refreshes the server's session timer!

### Method 2: Inspect the Button & JavaScript Event Listener
1. When the popup is visible, right-click directly on the reset button and select **Inspect**.
2. Look at the HTML in the **Elements** tab:
   - Does it have an `id` (e.g., `id="btnStayLoggedIn"`) or `class`?
   - Does it have an `onclick="someFunction()"` attribute?
3. On the right-side subpanel of the **Elements** tab, click **Event Listeners**:
   - Expand `click`.
   - Chrome will show you the exact JavaScript filename and line number where the click handler is attached!
   - Click on the link to jump directly to the ERP's source code and read what the function does.

### Method 3: Global Code Search (Find the Timer)
1. In DevTools, press `Ctrl + Shift + F` (Windows/Linux) or `Cmd + Option + F` (Mac) to open the global search drawer.
2. Search for words from the popup, such as:
   - `"session"`
   - `"timeout"`
   - `"10 minutes"`
   - `600000` (10 minutes in milliseconds)
3. This reveals the JavaScript timer (`setInterval` or `setTimeout`) that counts down and displays the modal.

### Method 4: Instant Console Spy
You can also copy the contents of `devtools-snippet.js` and paste it into the DevTools Console. It will log every background fetch/AJAX request and give you an `inspectErpModal()` command to analyze visible buttons.

---

## ⚙️ How This Extension Keeps You Always Logged In

The extension employs a **dual-layer defense strategy**:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                    IIT KGP ERP Portal                       │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Layer 1: Proactive Heartbeat│        │  Layer 2: Reactive Clicker   │
│  (Prevents Server Timeout)   │        │  (Suppresses Frontend Modal) │
├──────────────────────────────┤        ├──────────────────────────────┤
│ Pings ERP every 5 minutes    │        │ MutationObserver watches DOM │
│ Refreshes JSESSIONID cookie  │        │ Detects 10-min warning popup │
│ Server never marks idle      │        │ Auto-clicks "Stay Logged In" │
└──────────────────────────────┘        └──────────────────────────────┘
```

1. **Layer 1 — Proactive Keep-Alive Heartbeat:**
   - The Java/Tomcat server expires sessions when no requests are received for 15–30 minutes.
   - The extension automatically sends a lightweight authenticated `fetch('/IIT_ERP3/')` request every 5 minutes in the background.
   - As a result, the server updates its `lastAccessedTime` and the session never goes idle.

2. **Layer 2 — Intelligent DOM Auto-Clicker:**
   - If the portal uses a separate client-side timer that shows a warning popup regardless of server activity, the extension's content script monitors the page with a `MutationObserver`.
   - The moment the popup appears, the extension identifies the "Stay Logged In" / "Reset" button and programmatically clicks it within milliseconds.
   - A non-intrusive in-page toast confirms: *"Session Auto-Extended"*.

---

## 🚀 How to Install & Use the Extension

1. **Open Chrome Extensions Page:**
   - In Google Chrome (or Edge / Brave / Chromium), navigate to `chrome://extensions/`.
2. **Enable Developer Mode:**
   - Toggle the **"Developer mode"** switch in the top-right corner.
3. **Load Unpacked Extension:**
   - Click the **"Load unpacked"** button in the top-left.
   - Select this folder: `/home/onesine/gitClone/ERP_Stay_Logged_In`.
4. **Pin & Open Extension:**
   - Click the puzzle icon in the Chrome toolbar and pin **"IIT KGP ERP - Stay Logged In"**.
   - Click the extension icon to view your live session stats, adjust the ping interval (3, 5, 8, or 10 mins), or test a manual ping.
5. **Open ERP:**
   - Navigate to `https://erp.iitkgp.ac.in/` and log in.
   - The extension will automatically guard your session!

---

## 🎛️ Customization & Settings

Click on the extension icon in the toolbar:
- **Auto-Click Popups:** Enabled by default.
- **Keep-Alive Interval:** Set how frequently the extension pings the server (default: 5 minutes).
- **Custom Button Selector:** (Under *Advanced Customization*) If you inspected the button and want to target a specific ID (e.g. `#customBtnId`), you can enter it here. Otherwise, the built-in heuristic auto-detects standard buttons.
- **Custom URL:** Change the keep-alive URL if you prefer pinging another ERP endpoint.

---

## 🔒 Security & Privacy

- **100% Client-Side:** Runs completely inside your browser. No credentials, tokens, or personal information are ever stored, logged, or sent to external servers.
- **Scattered-Frame Support:** Operates seamlessly across nested `<iframe>` elements commonly used throughout IIT KGP ERP.
