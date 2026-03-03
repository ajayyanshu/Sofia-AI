// DOM elements
const scanUrlInput = document.getElementById('scan-url');
const startScanBtn = document.getElementById('start-scan-btn');
const scanProgressContainer = document.getElementById('scan-progress-container');
const scanProgressBar = document.getElementById('scan-progress-bar');
const scanStatus = document.getElementById('scan-status');
const scanLog = document.getElementById('scan-log');
const scanResults = document.getElementById('scan-results');
const resultsList = document.getElementById('results-list');
const scanLimitInfo = document.getElementById('scan-limit-info');

// State
let scansLeft = 1; // free user default
let isScanning = false;
let isAdmin = false; // we could fetch this, but for demo we'll leave as false

// Helper: add log entry
function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    scanLog.appendChild(entry);
    scanLog.scrollTop = scanLog.scrollHeight;
}

// Simulate scan
async function startScan() {
    const url = scanUrlInput.value.trim();
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    if (!isAdmin && scansLeft <= 0) {
        alert('You have reached your daily scan limit. Upgrade to scan more.');
        return;
    }

    // Deduct scan (in real app, this would be handled by backend)
    if (!isAdmin) {
        scansLeft--;
        scanLimitInfo.textContent = `Scans left today: ${scansLeft}`;
    }

    isScanning = true;
    startScanBtn.disabled = true;
    scanProgressContainer.classList.remove('hidden');
    scanLog.classList.remove('hidden');
    scanLog.innerHTML = ''; // clear previous
    scanResults.classList.add('hidden');
    resultsList.innerHTML = '';

    const steps = [
        { progress: 10, status: 'Checking target availability...', log: '🌐 Resolving domain and checking server response...' },
        { progress: 25, status: 'Enumerating directories...', log: '🔍 Searching for common directories and backup files...' },
        { progress: 40, status: 'Testing for SQL injection...', log: '💉 Injecting SQL payloads into parameters...' },
        { progress: 55, status: 'Checking for XSS vulnerabilities...', log: '📜 Inserting script tags to test for reflection...' },
        { progress: 70, status: 'Analyzing headers & cookies...', log: '🍪 Inspecting security headers and cookie flags...' },
        { progress: 85, status: 'Checking SSL/TLS configuration...', log: '🔒 Validating certificate and cipher suites...' },
        { progress: 100, status: 'Scan completed!', log: '✅ Finalizing report...' }
    ];

    for (let i = 0; i < steps.length; i++) {
        if (!isScanning) break;
        scanProgressBar.style.width = steps[i].progress + '%';
        scanStatus.textContent = steps[i].status;
        addLogEntry(steps[i].log);
        await new Promise(resolve => setTimeout(resolve, 800)); // simulate work
    }

    if (isScanning) {
        // Mock results
        const mockVulns = [
            { title: 'SQL Injection', severity: 'critical', description: 'Parameter "id" is vulnerable to time-based blind SQL injection.', remediation: 'Use prepared statements and parameterized queries.' },
            { title: 'Cross-Site Scripting (XSS)', severity: 'high', description: 'Reflected XSS found in search parameter.', remediation: 'Escape user input and use Content-Security-Policy.' },
            { title: 'Missing Security Headers', severity: 'medium', description: 'X-Frame-Options, X-Content-Type-Options headers are missing.', remediation: 'Add these headers to prevent clickjacking and MIME sniffing.' },
            { title: 'Outdated Server Version', severity: 'low', description: 'Server reveals version information.', remediation: 'Hide server version banners.' }
        ];

        mockVulns.forEach(v => {
            const item = document.createElement('div');
            item.className = `result-item ${v.severity}`;
            item.innerHTML = `
                <div class="result-title">
                    <span class="severity-${v.severity} px-2 py-0.5 rounded-full text-xs font-bold uppercase">${v.severity}</span>
                    ${v.title}
                </div>
                <div class="result-description">${v.description}</div>
                <div class="remediation">💡 ${v.remediation}</div>
            `;
            resultsList.appendChild(item);
        });

        scanResults.classList.remove('hidden');
        addLogEntry('🎯 Scan finished. Found 4 potential vulnerabilities.');
    }

    isScanning = false;
    startScanBtn.disabled = false;
    startScanBtn.textContent = 'Scan Again';
}

// Event listeners
startScanBtn.addEventListener('click', startScan);

// Optional: fetch user info (admin status, scans left) from server
async function loadUserInfo() {
    try {
        const res = await fetch('/get_user_info');
        if (res.ok) {
            const data = await res.json();
            isAdmin = data.isAdmin || false;
            scansLeft = data.scansLeft || 1; // server should provide this
            scanLimitInfo.textContent = `Scans left today: ${scansLeft}`;
        }
    } catch (e) {
        console.warn('Could not fetch user info, using defaults');
    }
}
loadUserInfo();

// Dark mode detection (respect system preference)
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
});
