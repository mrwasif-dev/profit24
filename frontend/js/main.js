// API URL
const API_URL = window.location.origin;

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        z-index: 9999;
        font-size: 14px;
        animation: slideUp 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Token management
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Check authentication
function checkAuth() {
    const token = getToken();
    const publicPages = ['/', '/index.html', '/faq.html', '/leaderboard.html', '/plans.html'];
    const currentPage = window.location.pathname;
    
    if (!token && !publicPages.includes(currentPage) && currentPage !== '/') {
        window.location.href = '/';
    }
}

// Logout
function logout() {
    removeToken();
    window.location.href = '/';
}

// Show Sign In Modal
function showSignIn() {
    document.getElementById('signinModal').style.display = 'flex';
}

// Show Sign Up Modal
function showSignUp() {
    document.getElementById('signupModal').style.display = 'flex';
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Sign In
async function signIn() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success) {
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showToast('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    } else {
        showToast(data.error, 'error');
    }
}

// Sign Up
async function signUp() {
    const username = document.getElementById('signupUsername').value;
    const whatsapp = document.getElementById('signupWhatsapp').value;
    const password = document.getElementById('signupPassword').value;
    const referralCode = document.getElementById('referralCode').value;
    
    if (!username || !whatsapp || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, whatsapp, password, referralCode })
    });
    
    const data = await response.json();
    if (data.success) {
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    } else {
        showToast(data.error, 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    
    if (signinForm) {
        signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signIn();
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signUp();
        });
    }
    
    // Close modal on outside click
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});
