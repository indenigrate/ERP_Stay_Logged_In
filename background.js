/**
 * IIT KGP ERP - Stay Logged In (Service Worker)
 * 
 * Manages background alarms, default settings persistence, and badge indicators.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  pingIntervalMinutes: 5,
  customPingUrl: '/IIT_ERP3/keepAlive.htm',
  customButtonSelector: '#sessionModal button',
  showToasts: true,
  autoClickPopups: true,
  debugMode: false
};

// Extension installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(['erpSettings', 'stats', 'activityLog']);

  if (!current.erpSettings) {
    await chrome.storage.local.set({ erpSettings: DEFAULT_SETTINGS });
  }

  if (!current.stats) {
    await chrome.storage.local.set({
      stats: {
        pings: 0,
        autoClicks: 0,
        lastPingTime: null,
        lastAutoClickTime: null
      }
    });
  }

  if (!current.activityLog) {
    await chrome.storage.local.set({
      activityLog: [
        {
          id: 'welcome_' + Date.now(),
          type: 'info',
          message: 'IIT KGP ERP Stay Logged In extension installed',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        }
      ]
    });
  }

  // Configure periodic alarm (runs every 5 minutes)
  await chrome.alarms.create('erpBackgroundKeepAlive', {
    periodInMinutes: 5
  });

  await updateBadge(current.erpSettings?.enabled ?? true);
});

// Update toolbar icon badge
async function updateBadge(enabled) {
  try {
    if (enabled) {
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Emerald Green
    } else {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748B' }); // Slate Gray
    }
  } catch (err) {
    console.error('Badge update failed:', err);
  }
}

// Background alarm handler (runs even when content tab is idle)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'erpBackgroundKeepAlive') return;

  const { erpSettings } = await chrome.storage.local.get('erpSettings');
  if (!erpSettings || !erpSettings.enabled) return;

  // Check if any IIT KGP ERP tab is currently open
  const tabs = await chrome.tabs.query({ url: '*://erp.iitkgp.ac.in/*' });
  if (tabs && tabs.length > 0) {
    // Notify the first open ERP tab to perform a refresh
    try {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'ping_now' });
    } catch {
      // Tab might still be loading or sleeping, ignorable
    }
  }
});

// Sync badge on storage change
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.erpSettings) {
    const isEnabled = changes.erpSettings.newValue?.enabled ?? true;
    await updateBadge(isEnabled);
  }
});
