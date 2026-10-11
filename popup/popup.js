/**
 * IIT KGP ERP - Stay Logged In (Popup Controller)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const mainToggle = document.getElementById('mainToggle');
  const autoClickToggle = document.getElementById('autoClickToggle');
  const pingIntervalSelect = document.getElementById('pingIntervalSelect');
  const toastsToggle = document.getElementById('toastsToggle');
  const customPingUrl = document.getElementById('customPingUrl');
  const customSelector = document.getElementById('customSelector');

  const statusBanner = document.getElementById('statusBanner');
  const statusDot = document.getElementById('statusDot');
  const statusHeading = document.getElementById('statusHeading');
  const statusSubtext = document.getElementById('statusSubtext');

  const pingsCount = document.getElementById('pingsCount');
  const clicksCount = document.getElementById('clicksCount');
  const lastActionTime = document.getElementById('lastActionTime');
  const activityList = document.getElementById('activityList');

  const btnManualPing = document.getElementById('btnManualPing');
  const btnTestDetection = document.getElementById('btnTestDetection');
  const btnResetStats = document.getElementById('btnResetStats');

  let activeErpTab = null;

  // 1. Check if user is currently on an ERP tab
  async function checkActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('erp.iitkgp.ac.in')) {
        activeErpTab = tab;
        statusSubtext.textContent = 'Connected to active ERP tab';
      } else {
        // Look for any ERP tab in other tabs/windows
        const erpTabs = await chrome.tabs.query({ url: '*://erp.iitkgp.ac.in/*' });
        if (erpTabs && erpTabs.length > 0) {
          activeErpTab = erpTabs[0];
          statusSubtext.textContent = `Guarding background ERP tab (${erpTabs.length} open)`;
        } else {
          statusSubtext.textContent = 'No ERP tab open. Open erp.iitkgp.ac.in';
        }
      }
    } catch (e) {
      console.warn('Could not inspect tabs:', e);
    }
  }

  // 2. Load stored configuration and stats
  async function loadData() {
    const data = await chrome.storage.local.get(['erpSettings', 'stats', 'activityLog']);
    const settings = data.erpSettings || {};
    const stats = data.stats || { pings: 0, autoClicks: 0 };
    const activityLog = data.activityLog || [];

    // Populate toggles & inputs
    mainToggle.checked = settings.enabled !== false;
    autoClickToggle.checked = settings.autoClickPopups !== false;
    toastsToggle.checked = settings.showToasts !== false;
    pingIntervalSelect.value = String(settings.pingIntervalMinutes || 5);
    customPingUrl.value = settings.customPingUrl || '/IIT_ERP3/';
    customSelector.value = settings.customButtonSelector || '';

    updateStatusUI(mainToggle.checked);

    // Populate stats
    pingsCount.textContent = stats.pings || 0;
    clicksCount.textContent = stats.autoClicks || 0;

    if (stats.lastPingTime || stats.lastAutoClickTime) {
      lastActionTime.textContent = `Last: ${stats.lastPingTime || stats.lastAutoClickTime}`;
    } else {
      lastActionTime.textContent = 'No actions yet';
    }

    renderActivityLog(activityLog);
  }

  // 3. Render activity log entries
  function renderActivityLog(log) {
    if (!log || log.length === 0) {
      activityList.innerHTML = '<div class="empty-log">Extension is active. Activity will appear here.</div>';
      return;
    }

    activityList.innerHTML = '';
    log.slice(0, 15).forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <span class="activity-item-msg" title="${entry.message}">${entry.message}</span>
        <span class="activity-item-time">${entry.time}</span>
      `;
      activityList.appendChild(item);
    });
  }

  // 4. Update status display based on enabled state
  function updateStatusUI(enabled) {
    if (enabled) {
      statusBanner.classList.remove('disabled');
      statusDot.classList.remove('disabled');
      statusHeading.textContent = 'Active & Guarding';
    } else {
      statusBanner.classList.add('disabled');
      statusDot.classList.add('disabled');
      statusHeading.textContent = 'Paused';
      statusSubtext.textContent = 'Auto keep-alive is currently disabled';
    }
  }

  // 5. Save settings to storage & notify tabs
  async function saveSettings() {
    const newSettings = {
      enabled: mainToggle.checked,
      autoClickPopups: autoClickToggle.checked,
      pingIntervalMinutes: parseInt(pingIntervalSelect.value, 10),
      showToasts: toastsToggle.checked,
      customPingUrl: customPingUrl.value.trim() || '/IIT_ERP3/',
      customButtonSelector: customSelector.value.trim(),
      debugMode: false
    };

    await chrome.storage.local.set({ erpSettings: newSettings });
    updateStatusUI(newSettings.enabled);

    // Broadcast to open tabs
    const erpTabs = await chrome.tabs.query({ url: '*://erp.iitkgp.ac.in/*' });
    for (const tab of erpTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'update_settings' });
      } catch {
        // Tab may not have script ready
      }
    }
  }

  // Event Listeners for inputs
  mainToggle.addEventListener('change', saveSettings);
  autoClickToggle.addEventListener('change', saveSettings);
  toastsToggle.addEventListener('change', saveSettings);
  pingIntervalSelect.addEventListener('change', saveSettings);
  customPingUrl.addEventListener('change', saveSettings);
  customSelector.addEventListener('change', saveSettings);

  // Manual Ping button
  btnManualPing.addEventListener('click', async () => {
    const originalText = btnManualPing.innerHTML;
    btnManualPing.disabled = true;
    btnManualPing.innerHTML = '<span>Pinging...</span>';

    try {
      if (activeErpTab) {
        const response = await chrome.tabs.sendMessage(activeErpTab.id, { action: 'ping_now' });
        if (response && response.success) {
          btnManualPing.innerHTML = '<span>Success! (200 OK)</span>';
        } else {
          btnManualPing.innerHTML = '<span>Ping Sent</span>';
        }
      } else {
        // Direct fetch from extension context
        const res = await fetch('https://erp.iitkgp.ac.in' + (customPingUrl.value.trim() || '/IIT_ERP3/'), {
          credentials: 'include'
        });
        btnManualPing.innerHTML = res.ok ? '<span>Success!</span>' : `<span>HTTP ${res.status}</span>`;
      }
    } catch (err) {
      btnManualPing.innerHTML = '<span>Failed to reach ERP</span>';
      console.error(err);
    }

    setTimeout(() => {
      btnManualPing.disabled = false;
      btnManualPing.innerHTML = originalText;
      loadData();
    }, 1500);
  });

  // Test Detection button
  btnTestDetection.addEventListener('click', async () => {
    if (!activeErpTab) {
      alert('Please open or focus the IIT KGP ERP portal tab (erp.iitkgp.ac.in) first to run detection.');
      return;
    }

    const originalText = btnTestDetection.innerHTML;
    btnTestDetection.disabled = true;
    btnTestDetection.innerHTML = '<span>Scanning DOM...</span>';

    try {
      const response = await chrome.tabs.sendMessage(activeErpTab.id, { action: 'test_detection' });
      if (response && response.detectedAndHandled) {
        btnTestDetection.innerHTML = '<span>Found & Clicked!</span>';
      } else {
        btnTestDetection.innerHTML = '<span>No Modal Present</span>';
      }
    } catch {
      btnTestDetection.innerHTML = '<span>No ERP Script</span>';
    }

    setTimeout(() => {
      btnTestDetection.disabled = false;
      btnTestDetection.innerHTML = originalText;
      loadData();
    }, 1600);
  });

  // Reset Stats button
  btnResetStats.addEventListener('click', async () => {
    if (confirm('Reset session statistics and activity logs?')) {
      await chrome.storage.local.set({
        stats: { pings: 0, autoClicks: 0, lastPingTime: null, lastAutoClickTime: null },
        activityLog: []
      });
      await loadData();
    }
  });

  // Dynamic storage sync while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.stats || changes.activityLog) {
        loadData();
      }
    }
  });

  // Initial load
  await checkActiveTab();
  await loadData();
});
