// Global app configuration
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://your-backend-url.onrender.com';

// Utility functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showAlert(message, type = 'info') {
    // Create alert element if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    let icon = '💼';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    alert.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;

    alertContainer.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// API call wrapper
async function apiCall(endpoint, method = 'GET', data = null, authToken = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add user ID header if user is logged in
    const userData = getUserData();
    if (userData && userData.userId) {
        options.headers['X-User-Id'] = userData.userId;
    }

    // Add auth token if provided
    if (authToken) {
        options.headers['Authorization'] = authToken;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// User data management
function saveUserData(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
}

function getUserData() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

function clearUserData() {
    localStorage.removeItem('userData');
}

// Date/time formatting utilities
function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Form validation utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateRequired(value) {
    return value && value.toString().trim().length > 0;
}

// Debounce utility for search/input handlers
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local storage helpers with error handling
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('LocalStorage set error:', error);
        return false;
    }
}

function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('LocalStorage get error:', error);
        return defaultValue;
    }
}

// Network status monitoring
function checkNetworkStatus() {
    if (!navigator.onLine) {
        showAlert('No internet connection. Please check your network.', 'warning');
        return false;
    }
    return true;
}

// Add network status listeners
window.addEventListener('online', () => {
    showAlert('Connection restored!', 'success');
});

window.addEventListener('offline', () => {
    showAlert('Connection lost. Some features may not work.', 'warning');
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'error');
});

// Prevent form submission on Enter key for specific inputs
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.type === 'search') {
        event.preventDefault();
    }
});

// Auto-focus first input on page load
document.addEventListener('DOMContentLoaded', () => {
    const firstInput = document.querySelector('input:not([type="hidden"]):not([disabled])');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
});