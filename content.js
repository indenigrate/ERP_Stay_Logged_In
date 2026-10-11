/**
 * IIT KGP ERP - Stay Logged In (Content Script)
 * 
 * Functions:
 * 1. Proactive Keep-Alive: Periodically pings the ERP portal to refresh the session cookie.
 * 2. Reactive Auto-Clicker: Uses MutationObserver + Polling to detect session timeout warning
 *    popups and automatically clicks the reset/extend button.
 * 3. In-page Toast Notifications & Activity Logging.
 */

(function () {
  // Prevent duplicate initialization in the same window context
  if (window.__erpStayLoggedInInitialized) return;
  window.__erpStayLoggedInInitialized = true;

  const DEFAULT_SETTINGS = {
    enabled: true,
    pingIntervalMinutes: 5,
    customPingUrl: '/IIT_ERP3/',
    customButtonSelector: '',
    showToasts: true,
    autoClickPopups: true,
    debugMode: false
  };

  let settings = { ...DEFAULT_SETTINGS };
  let pingTimer = null;
  let pollTimer = null;
  let observer = null;
  let lastActionTimestamp = 0;

  // Logging helper
  function logDebug(...args) {
    if (settings.debugMode) {
      console.log('[ERP-Stay-Logged-In]', ...args);
    }
  }

  // Load settings from chrome.storage.local
  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get('erpSettings');
      if (data && data.erpSettings) {
        settings = { ...DEFAULT_SETTINGS, ...data.erpSettings };
      }
      restartKeepAlive();
    } catch (err) {
      logDebug('Failed to load settings:', err);
    }
  }

  // Display unobtrusive toast notification
  function showToast(title, desc) {
    if (!settings.showToasts) return;

    // Remove existing toast if any
    const existing = document.getElementById('erp-stay-logged-in-toast-node');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'erp-stay-logged-in-toast-node';
    toast.className = 'erp-stay-logged-in-toast';
    toast.innerHTML = `
      <div class="toast-icon">⚡</div>
      <div class="toast-content">
        <span class="toast-title">${title}</span>
        <span class="toast-desc">${desc}</span>
      </div>
      <button class="toast-close" title="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // Record an event in chrome.storage.local for popup display
  async function recordEvent(type, message) {
    try {
      const current = await chrome.storage.local.get(['stats', 'activityLog']);
      const stats = current.stats || { pings: 0, autoClicks: 0, lastPingTime: null, lastAutoClickTime: null };
      const activityLog = current.activityLog || [];

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (type === 'ping') {
        stats.pings = (stats.pings || 0) + 1;
        stats.lastPingTime = now;
      } else if (type === 'autoclick') {
        stats.autoClicks = (stats.autoClicks || 0) + 1;
        stats.lastAutoClickTime = now;
      }

      activityLog.unshift({
        id: Date.now() + Math.random().toString(),
        type,
        message,
        time: now,
        timestamp: Date.now()
      });

      // Keep up to 25 latest events
      if (activityLog.length > 25) activityLog.length = 25;

      await chrome.storage.local.set({ stats, activityLog });
    } catch (e) {
      logDebug('Failed to update stats/log:', e);
    }
  }

  // Execute SessionManager.extend() directly in page's main context
  function invokePageSessionExtend() {
    try {
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          // Fix ERP developer bug: keepAliveUrl defaults to '/keepAlive.htm' (404)
          // instead of '/IIT_ERP3/keepAlive.htm'
          if (!window.keepAliveUrl || window.keepAliveUrl === '/keepAlive.htm') {
            window.keepAliveUrl = '/IIT_ERP3/keepAlive.htm';
          }

          if (window.SessionManager && typeof window.SessionManager.extend === 'function') {
            window.SessionManager.extend();
          }

          // Force-hide modal and clear countdown in case of any network delay
          if (window.$ && $('#sessionModal').length) {
            $('#sessionModal').modal('hide');
          }

          // Directly sync localStorage
          const now = Date.now();
          localStorage.setItem('session-expiry', String(now + 1800000));
          localStorage.setItem('session-event', JSON.stringify({ action: 'RESET_SESSION', time: now }));
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      logDebug('Invoked window.SessionManager.extend() in main page context');
      return true;
    } catch (e) {
      logDebug('Failed to invoke main context SessionManager:', e);
      return false;
    }
  }

  // Proactive Keep-Alive Ping & Session Reset
  async function performKeepAlivePing(manual = false) {
    if (!settings.enabled && !manual) return { success: false, reason: 'Disabled' };

    // 1. Invoke native ERP SessionManager.extend() in page context with corrected URL
    invokePageSessionExtend();

    // 2. Proactively ping ERP endpoints with valid /IIT_ERP3/ path prefix
    const pingEndpoints = [
      settings.customPingUrl || '/IIT_ERP3/keepAlive.htm',
      '/IIT_ERP3/',
      '/IIT_ERP3/keepAlive.htm'
    ];

    let successResponse = null;
    let durationMs = 0;

    for (const url of pingEndpoints) {
      try {
        const startTime = performance.now();
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
          }
        });
        durationMs = Math.round(performance.now() - startTime);
        if (response.ok) {
          successResponse = response;
          break;
        }
      } catch (err) {
        logDebug(`Fetch failed for ${url}:`, err);
      }
    }

    // 3. Update localStorage session-expiry (+30 min) and broadcast RESET_SESSION
    const now = Date.now();
    try {
      localStorage.setItem('session-expiry', String(now + 1800000));
      localStorage.setItem('session-event', JSON.stringify({ action: 'RESET_SESSION', time: now }));

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'session-event',
        newValue: JSON.stringify({ action: 'RESET_SESSION', time: now }),
        url: window.location.href,
        storageArea: localStorage
      }));
    } catch (storageErr) {
      logDebug('LocalStorage sync notice:', storageErr);
    }

    await recordEvent('ping', `Session extended (${durationMs}ms)`);
    if (manual) {
      showToast('Keep-Alive Extended', `Session refreshed and timer pushed +30 mins!`);
    }

    return { success: true, duration: durationMs };
  }

  // Restart keep-alive interval
  function restartKeepAlive() {
    if (pingTimer) clearInterval(pingTimer);
    if (!settings.enabled) return;

    const intervalMs = Math.max(1, settings.pingIntervalMinutes || 5) * 60 * 1000;
    pingTimer = setInterval(() => {
      performKeepAlivePing(false);
    }, intervalMs);

    logDebug(`Keep-alive heartbeat active: every ${settings.pingIntervalMinutes} minutes.`);
  }

  // Helper to check if an element is visibly displayed
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      (el.offsetWidth > 0 || el.offsetHeight > 0 || el.classList.contains('show') || el.classList.contains('in'))
    );
  }

  // Heuristic detector for session timeout popups and extend buttons
  function detectAndClickTimeoutPopup() {
    if (!settings.enabled || !settings.autoClickPopups) return false;

    // Rate-limit clicks to avoid spam (at least 5 seconds between triggers)
    if (Date.now() - lastActionTimestamp < 5000) return false;

    // 1. Direct Target: IIT KGP ERP's exact #sessionModal
    const erpModal = document.getElementById('sessionModal');
    if (erpModal && isVisible(erpModal)) {
      logDebug('Targeted ERP #sessionModal found active!');
      // First invoke official API method
      invokePageSessionExtend();

      // Also click the action button inside the modal
      const modalBtn = erpModal.querySelector('button, .btn, input[type="button"], a.btn');
      if (modalBtn) {
        triggerClick(modalBtn, 'IIT KGP #sessionModal extend button');
        return true;
      }
    }

    // 2. User-specified selector if provided
    if (settings.customButtonSelector) {
      try {
        const customTarget = document.querySelector(settings.customButtonSelector);
        if (customTarget && isVisible(customTarget)) {
          triggerClick(customTarget, 'Custom selector match: ' + settings.customButtonSelector);
          return true;
        }
      } catch (err) {
        logDebug('Invalid custom selector:', err);
      }
    }

    // 3. Fallback: Common Dialog & Modal containers
    const dialogSelectors = [
      '#sessionModal',
      '[role="dialog"]',
      '.modal',
      '.ui-dialog',
      'div[id*="session" i]'
    ];

    const sessionTextRegex = /(session|expire|expiring|timeout|time-out|idle|logout)/i;
    const buttonTextRegex = /^(stay\s*logged\s*in|extend|keep\s*alive|reset|continue|ok|yes)$/i;

    const dialogCandidates = document.querySelectorAll(dialogSelectors.join(','));
    for (const dialog of dialogCandidates) {
      if (!isVisible(dialog)) continue;

      const dialogText = dialog.textContent || '';
      if (!sessionTextRegex.test(dialogText)) continue;

      // Look for action buttons inside the detected dialog
      const buttons = dialog.querySelectorAll('button, input[type="button"], a.btn, .btn');
      for (const btn of buttons) {
        if (!isVisible(btn)) continue;
        const btnText = (btn.textContent || btn.value || '').trim();

        if (buttonTextRegex.test(btnText) || btnText.toLowerCase().includes('stay') || btnText.toLowerCase().includes('extend') || btnText.toLowerCase().includes('reset')) {
          invokePageSessionExtend();
          triggerClick(btn, `Auto-detected button: "${btnText}"`);
          return true;
        }
      }
    }

    return false;
  }

  // Simulate user click event
  function triggerClick(element, reason) {
    lastActionTimestamp = Date.now();
    logDebug('Clicking target element:', element, 'Reason:', reason);

    try {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      element.click();

      showToast('Session Auto-Extended', 'Automatically clicked the keep-alive button.');
      recordEvent('autoclick', `Dismissed timeout popup (${reason})`);
    } catch (err) {
      logDebug('Error clicking button:', err);
    }
  }

  // Initialize DOM MutationObserver
  function initObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      // Check when nodes are added or attributes change
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.attributeName === 'style' || mutation.attributeName === 'class') {
          detectAndClickTimeoutPopup();
          break;
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden']
      });
    }

    // Safety fallback polling every 4 seconds in case changes bypass mutation events
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(detectAndClickTimeoutPopup, 4000);
  }

  // Message listener from extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping_now') {
      performKeepAlivePing(true).then((result) => sendResponse(result));
      return true; // Keep message channel open for async response
    }

    if (request.action === 'update_settings') {
      loadSettings().then(() => sendResponse({ success: true }));
      return true;
    }

    if (request.action === 'test_detection') {
      const found = detectAndClickTimeoutPopup();
      sendResponse({ detectedAndHandled: found });
      return true;
    }

    if (request.action === 'get_page_status') {
      sendResponse({
        url: window.location.href,
        isIframe: window.self !== window.top,
        initialized: true
      });
      return false;
    }
  });

  // Watch for storage changes dynamically
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.erpSettings) {
      settings = { ...DEFAULT_SETTINGS, ...changes.erpSettings.newValue };
      restartKeepAlive();
    }
  });

  // Startup initialization
  loadSettings().then(() => {
    initObserver();
    // Immediate check on document ready
    detectAndClickTimeoutPopup();
  });
})();
