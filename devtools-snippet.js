/**
 * IIT KGP ERP - Session Popup Inspector & Spy Snippet
 * 
 * Paste this snippet into your browser DevTools Console (F12 -> Console)
 * while logged into erp.iitkgp.ac.in to analyze the auto-logout mechanism.
 */

(function () {
  console.log("%c[ERP Session Inspector] Initialized!", "color: #06b6d4; font-weight: bold; font-size: 14px;");

  // 1. Spy on all outgoing Fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    console.log("%c[FETCH SPY]", "color: #3b82f6; font-weight: bold;", args[0], args[1] || {});
    return originalFetch.apply(this, args);
  };

  // 2. Spy on all outgoing XMLHttpRequest (AJAX) calls
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    console.log("%c[XHR SPY]", "color: #10b981; font-weight: bold;", this._method, this._url, body || '(no body)');
    return originalSend.apply(this, arguments);
  };

  // 3. Helper to inspect the currently visible popup and buttons
  window.inspectErpModal = function () {
    console.group("%c[ERP Modal Inspection Results]", "color: #f59e0b; font-weight: bold; font-size: 13px;");
    
    // Look for all visible buttons
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a.btn, .btn'));
    const candidates = buttons.filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetWidth > 0;
    });

    console.log(`Found ${candidates.length} visible buttons on page:`);
    candidates.forEach((btn, index) => {
      const text = (btn.textContent || btn.value || '').trim();
      const id = btn.id ? `#${btn.id}` : '(no id)';
      const classes = btn.className ? `.${btn.className.split(' ').join('.')}` : '(no class)';
      const onclick = btn.getAttribute('onclick') || '(no inline onclick)';
      
      console.log(`\nButton [${index + 1}]: "${text}"`);
      console.log(`  Selector hint:`, id !== '(no id)' ? id : classes);
      console.log(`  Inline onclick:`, onclick);
      console.log(`  Element DOM:`, btn);
      
      // Check event listeners if Chrome supports getEventListeners
      if (typeof getEventListeners === 'function') {
        const listeners = getEventListeners(btn);
        console.log(`  Attached listeners:`, listeners);
      }
    });

    console.groupEnd();
  };

  // 4. Helper to trigger an immediate Keep-Alive ping and reset LocalStorage
  window.testPing = async function (url = '/IIT_ERP3/') {
    console.log(`Pinging ${url}...`);
    try {
      const start = performance.now();
      const res = await fetch(url, { credentials: 'include' });
      const duration = Math.round(performance.now() - start);
      
      const now = Date.now();
      localStorage.setItem('session-expiry', String(now + 1800000));
      localStorage.setItem('session-event', JSON.stringify({ action: "RESET_SESSION", time: now }));
      
      console.log(`%c[PING & RESET SUCCESS] HTTP ${res.status} in ${duration}ms! Session expiry pushed +30 mins.`, "color: green; font-weight: bold;");
    } catch (e) {
      console.error("[PING ERROR]", e);
    }
  };

  // 5. Helper to check current countdown status
  window.checkSessionStatus = function () {
    const expiry = parseInt(localStorage.getItem('session-expiry'), 10);
    if (!expiry) {
      console.warn("No 'session-expiry' found in localStorage.");
      return;
    }
    const msLeft = expiry - Date.now();
    const minutesLeft = (msLeft / (60 * 1000)).toFixed(1);
    console.log(`%c[SESSION STATUS] ${minutesLeft} minutes remaining before timeout!`, msLeft > 600000 ? "color: green; font-weight: bold;" : "color: red; font-weight: bold;");
    console.log("session-event:", localStorage.getItem('session-event'));
    console.log("session-expiry timestamp:", expiry);
  };

  console.log("%cUseful commands you can run now:", "color: #94a3b8; font-style: italic;");
  console.log("👉 Run %ccheckSessionStatus()%c to see exactly how many minutes are left before the popup.", "color: #06b6d4; font-weight: bold;", "color: inherit;");
  console.log("👉 Run %ctestPing()%c to test sending a ping & resetting the countdown right now.", "color: #10b981; font-weight: bold;", "color: inherit;");
  console.log("👉 Run %cinspectErpModal()%c when the popup appears to inspect the button.", "color: #f59e0b; font-weight: bold;", "color: inherit;");
})();
