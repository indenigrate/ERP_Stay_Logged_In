# Chrome Web Store Listing — IIT KGP ERP - Stay Logged In

> Last Updated: 2026-10-11

## Store Listing

**Extension Name** [REQUIRED]
IIT KGP ERP - Stay Logged In

**Short Description** [REQUIRED]
Keeps your IIT Kharagpur ERP portal session active and automatically handles session timeout popups.

**Detailed Description** [REQUIRED]
IIT KGP ERP - Stay Logged In is a lightweight, privacy-focused browser extension for students and faculty of IIT Kharagpur.

Key Features:
- Proactive Keep-Alive: Periodically pings the ERP portal in the background to ensure your session never times out due to inactivity.
- Smart Auto-Dismiss: Intelligently detects the ERP portal's 10-minute session expiration modal (#sessionModal) and automatically extends the session.
- Seamless Cross-Tab Sync: Fully integrates with ERP's native storage synchronization to keep all your open modules and tabs active.
- Non-Intrusive Interface: Includes a clean, modern status popup showing live session statistics, last ping timestamps, and customizable heartbeat intervals.

How to Use:
1. Install the extension.
2. Log into the IIT Kharagpur ERP portal (erp.iitkgp.ac.in) as usual.
3. The extension automatically activates and guards your session in the background.

Privacy & Security:
- 100% Local: Runs entirely in your browser. No passwords, credentials, or personal academic data are stored, tracked, or transmitted to any external server.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Maintains active user sessions on the IIT Kharagpur ERP portal and prevents automatic logouts.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Ready to take from browser | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores extension configuration (interval, custom options) and session counter statistics locally on the device. |
| `alarms` | permissions | Triggers scheduled background keep-alive wakeups at user-selected intervals. |
| `*://erp.iitkgp.ac.in/*` | host_permissions | Required to send authenticated keep-alive pings to the ERP portal and inject the content script to manage timeout modals on erp.iitkgp.ac.in. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Distribution

**Visibility**: Public
**Pricing**: Free

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-10-11 | Initial release with native SessionManager and #sessionModal integration | Draft |
