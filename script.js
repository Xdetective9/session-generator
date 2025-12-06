// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const pairBtn = document.getElementById('pairBtn');
const validatePairBtn = document.getElementById('validatePairCode');
const clearPairBtn = document.getElementById('clearPairBtn');
const copySessionIdBtn = document.getElementById('copySessionId');
const copyPairCodeBtn = document.getElementById('copyPairCode');
const sessionNameInput = document.getElementById('sessionName');
const sessionTypeSelect = document.getElementById('sessionType');
const pairCodeInput = document.getElementById('pairCodeInput');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const resultDisplay = document.getElementById('resultDisplay');
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const pairCodeDisplay = document.getElementById('pairCodeDisplay');
const expiryDisplay = document.getElementById('expiryDisplay');
const createdAtDisplay = document.getElementById('createdAtDisplay');
const pairStatus = document.getElementById('pairStatus');
const sessionsList = document.getElementById('sessionsList');
const toast = document.getElementById('toast');

// Sample sessions for demo
let generatedSessions = JSON.parse(localStorage.getItem('abdullah-md-sessions')) || [];
let currentSession = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadRecentSessions();
    
    // Generate a sample session on load for demo
    setTimeout(() => {
        generateSession(true);
    }, 1000);
});

// Generate Session ID
generateBtn.addEventListener('click', function() {
    generateSession();
});

// Reset Form
resetBtn.addEventListener('click', function() {
    sessionNameInput.value = 'abdullah-md-session';
    sessionTypeSelect.value = 'whatsapp';
    document.querySelector('input[name="security"][value="high"]').checked = true;
    
    resultDisplay.style.display = 'none';
    resultPlaceholder.style.display = 'block';
    
    showToast('Form reset successfully', 'success');
});

// Generate Session Function
function generateSession(isInitial = false) {
    const sessionName = sessionNameInput.value.trim() || 'abdullah-md-session';
    const sessionType = sessionTypeSelect.value;
    const security = document.querySelector('input[name="security"]:checked').value;
    
    // Generate session ID (32 chars)
    const sessionId = generateSecureId(32);
    
    // Generate pair code (16 chars, formatted)
    const pairCode = generatePairCode();
    
    // Set expiry (24 hours from now)
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Format dates
    const formattedCreatedAt = formatDate(now);
    const formattedExpiry = formatDate(expiry);
    
    // Create session object
    currentSession = {
        id: sessionId,
        name: sessionName,
        type: sessionType,
        security: security,
        pairCode: pairCode,
        createdAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        status: 'active'
    };
    
    // Update UI
    sessionIdDisplay.textContent = sessionId;
    pairCodeDisplay.textContent = pairCode;
    createdAtDisplay.textContent = formattedCreatedAt;
    expiryDisplay.textContent = '24 hours';
    
    // Show results
    resultPlaceholder.style.display = 'none';
    resultDisplay.style.display = 'block';
    
    // Add to sessions list if not initial demo
    if (!isInitial) {
        generatedSessions.unshift(currentSession);
        if (generatedSessions.length > 5) {
            generatedSessions = generatedSessions.slice(0, 5);
        }
        localStorage.setItem('abdullah-md-sessions', JSON.stringify(generatedSessions));
        loadRecentSessions();
        
        showToast('Session generated successfully!', 'success');
    }
}

// Generate Secure ID
function generateSecureId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const cryptoArray = new Uint8Array(length);
    crypto.getRandomValues(cryptoArray);
    
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[cryptoArray[i] % chars.length];
    }
    
    return result;
}

// Generate Pair Code (formatted)
function generatePairCode() {
    const part1 = generateSecureId(4).toUpperCase();
    const part2 = generateSecureId(4).toUpperCase();
    const part3 = generateSecureId(4).toUpperCase();
    const part4 = generateSecureId(4).toUpperCase();
    
    return `${part1}-${part2}-${part3}-${part4}`;
}

// Format Date
function formatDate(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Copy to Clipboard Functions
copySessionIdBtn.addEventListener('click', function() {
    copyToClipboard(currentSession.id);
    showToast('Session ID copied to clipboard!', 'success');
});

copyPairCodeBtn.addEventListener('click', function() {
    copyToClipboard(currentSession.pairCode);
    showToast('Pair code copied to clipboard!', 'success');
});

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Validate Pair Code
validatePairBtn.addEventListener('click', function() {
    const pairCode = pairCodeInput.value.trim().toUpperCase();
    
    if (!pairCode) {
        showPairStatus('Please enter a pair code', 'error');
        return;
    }
    
    // Validate format (XXXX-XXXX-XXXX-XXXX)
    const pairCodeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    
    if (!pairCodeRegex.test(pairCode)) {
        showPairStatus('Invalid pair code format. Use: XXXX-XXXX-XXXX-XXXX', 'error');
        pairBtn.disabled = true;
        return;
    }
    
    // Check if pair code exists in sessions
    const sessionExists = generatedSessions.some(session => 
        session.pairCode === pairCode
    );
    
    if (sessionExists || Math.random() > 0.3) { // 70% chance of success for demo
        showPairStatus('Pair code validated successfully! You can now pair your device.', 'success');
        pairBtn.disabled = false;
    } else {
        showPairStatus('Invalid pair code. Please check and try again.', 'error');
        pairBtn.disabled = true;
    }
});

// Pair Device
pairBtn.addEventListener('click', function() {
    const pairCode = pairCodeInput.value.trim().toUpperCase();
    
    showPairStatus(`Device paired successfully using code: ${pairCode}`, 'success');
    
    // Simulate pairing process
    setTimeout(() => {
        showToast('Device paired successfully! Session is now active.', 'success');
        
        // Reset
        pairCodeInput.value = '';
        pairBtn.disabled = true;
        pairStatus.className = 'status-message';
        pairStatus.style.display = 'none';
    }, 1000);
});

// Clear Pair Input
clearPairBtn.addEventListener('click', function() {
    pairCodeInput.value = '';
    pairBtn.disabled = true;
    pairStatus.className = 'status-message';
    pairStatus.style.display = 'none';
    showToast('Pair code input cleared', 'info');
});

// Show Pair Status
function showPairStatus(message, type) {
    pairStatus.textContent = message;
    pairStatus.className = `status-message ${type}`;
    pairStatus.style.display = 'block';
}

// Load Recent Sessions
function loadRecentSessions() {
    sessionsList.innerHTML = '';
    
    if (generatedSessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="session-item">
                <div class="session-info">
                    <h4>No recent sessions</h4>
                    <p>Generate a session to see it here</p>
                </div>
            </div>
        `;
        return;
    }
    
    generatedSessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';
        
        const formattedDate = formatDate(new Date(session.createdAt));
        
        sessionItem.innerHTML = `
            <div class="session-info">
                <h4>${session.name}</h4>
                <p>${formattedDate} • ${session.type}</p>
            </div>
            <div class="session-status">${session.status}</div>
        `;
        
        sessionsList.appendChild(sessionItem);
    });
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.style.background = 'linear-gradient(to right, #10b981, #34d399)';
        toastIcon.className = 'fas fa-check-circle toast-icon';
    } else if (type === 'error') {
        toast.style.background = 'linear-gradient(to right, #ef4444, #f87171)';
        toastIcon.className = 'fas fa-exclamation-circle toast-icon';
    } else {
        toast.style.background = 'linear-gradient(to right, #6b7280, #9ca3af)';
        toastIcon.className = 'fas fa-info-circle toast-icon';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + G to generate session
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        generateBtn.click();
    }
    
    // Ctrl/Cmd + R to reset
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        resetBtn.click();
    }
    
    // Escape to clear pair input
    if (e.key === 'Escape') {
        pairCodeInput.value = '';
    }
});

// Input validation for pair code
pairCodeInput.addEventListener('input', function() {
    // Auto-format as XXXX-XXXX-XXXX-XXXX
    let value = this.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (value.length > 16) {
        value = value.substring(0, 16);
    }
    
    // Add hyphens
    if (value.length > 12) {
        value = value.substring(0, 12) + '-' + value.substring(12);
    }
    if (value.length > 8) {
        value = value.substring(0, 8) + '-' + value.substring(8);
    }
    if (value.length > 4) {
        value = value.substring(0, 4) + '-' + value.substring(4);
    }
    
    this.value = value;
});
