// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    
    localStorage.setItem('theme', newTheme);
    showToast('Theme changed to ' + newTheme + ' mode');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            }
        });
    });
});

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    toastIcon.className = type === 'success' ? 'fas fa-check-circle toast-icon' : 
                         type === 'error' ? 'fas fa-exclamation-circle toast-icon' : 
                         'fas fa-info-circle toast-icon';
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Generate Pairing Code
const pairingForm = document.getElementById('pairingForm');
const generateBtn = document.getElementById('generateBtn');
const loadingSpinner = generateBtn.querySelector('.loading-spinner');
const generateBtnText = generateBtn.querySelector('span');
const resultCard = document.getElementById('resultCard');
const codeDigits = Array.from({length: 8}, (_, i) => document.getElementById(`codeDigit${i + 1}`));
const countdownElement = document.getElementById('countdown');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const newCodeBtn = document.getElementById('newCodeBtn');

// Session display elements
const sessionCodeDisplay = document.getElementById('sessionCodeDisplay');
const copySessionBtn = document.getElementById('copySessionBtn');
const downloadSessionBtn = document.getElementById('downloadSessionBtn');
const testSessionBtn = document.getElementById('testSessionBtn');

let countdownInterval;
let currentSessionId = '';

// Generate random 8-digit code
function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar characters
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Start countdown timer
function startCountdown(duration = 300) { // 5 minutes
    let timeLeft = duration;
    
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            showToast('Pairing code expired! Generate a new one.', 'error');
        }
        
        timeLeft--;
    }, 1000);
}

// Show result card
function showResult(code) {
    // Display code digits
    for (let i = 0; i < 8; i++) {
        codeDigits[i].textContent = code[i];
        codeDigits[i].style.animationDelay = `${i * 0.1}s`;
    }
    
    // Start countdown
    startCountdown(300);
    
    // Show result card
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth' });
    
    // Generate session ID
    generateSessionId(code);
}

// Generate Session ID
async function generateSessionId(pairingCode) {
    try {
        // In production, this would call your backend API
        // For demo, we'll generate a fake session ID
        const sessionId = btoa(`${Date.now()}-${pairingCode}-${Math.random().toString(36).substr(2, 9)}`);
        currentSessionId = sessionId;
        
        // Display session ID
        sessionCodeDisplay.innerHTML = `
            <div class="session-id">
                <code>${sessionId}</code>
            </div>
        `;
        
        // Enable session buttons
        copySessionBtn.disabled = false;
        downloadSessionBtn.disabled = false;
        testSessionBtn.disabled = false;
        
        // Switch to session tab
        document.querySelector('[data-tab="session"]').click();
        
        // Show success message
        showToast('Session ID generated successfully!');
        
    } catch (error) {
        console.error('Session generation failed:', error);
        showToast('Failed to generate session. Please try again.', 'error');
    }
}

// Form submission
pairingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phoneNumber').value;
    const countryCode = document.getElementById('countryCode').value;
    const fullNumber = countryCode + phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
        showToast('Please enter a valid phone number (at least 10 digits)', 'error');
        return;
    }
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtnText.textContent = 'Generating...';
    loadingSpinner.classList.remove('hidden');
    
    try {
        // In production, this would call your backend API
        // For now, simulate API call with delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate code
        const pairingCode = generateRandomCode();
        
        // Show result
        showResult(pairingCode);
        
        // Show success message
        showToast('Pairing code generated! Check the result below.');
        
    } catch (error) {
        console.error('Generation failed:', error);
        showToast('Failed to generate code. Please try again.', 'error');
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtnText.textContent = 'Generate Pairing Code';
        loadingSpinner.classList.add('hidden');
    }
});

// Copy code button
copyCodeBtn.addEventListener('click', () => {
    const code = Array.from(codeDigits).map(digit => digit.textContent).join('');
    navigator.clipboard.writeText(code).then(() => {
        showToast('Pairing code copied to clipboard!');
    });
});

// New code button
newCodeBtn.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    pairingForm.reset();
    clearInterval(countdownInterval);
});

// Copy session ID
copySessionBtn.addEventListener('click', () => {
    if (currentSessionId) {
        navigator.clipboard.writeText(currentSessionId).then(() => {
            showToast('Session ID copied to clipboard!');
        });
    }
});

// Download session
downloadSessionBtn.addEventListener('click', () => {
    if (currentSessionId) {
        const blob = new Blob([currentSessionId], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abdullah-md-session-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Session downloaded!');
    }
});

// Test session
testSessionBtn.addEventListener('click', async () => {
    try {
        // Simulate testing the session
        showToast('Testing session connection...', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate success
        showToast('Session is valid and ready to use!');
        
    } catch (error) {
        showToast('Session test failed. Please generate a new one.', 'error');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Initialize with some animations
document.addEventListener('DOMContentLoaded', () => {
    // Add animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('number')) {
        document.getElementById('phoneNumber').value = urlParams.get('number');
    }
    
    console.log('✨ Abdullah-MD Session Generator loaded successfully!');
});
