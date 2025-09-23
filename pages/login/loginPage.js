// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Redirect to dashboard if already logged in
    if (CookieHelpers.isLoggedIn()) {
        window.location.href = '../main/mainPage.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loadingMessage = document.getElementById('loadingMessage');
    const submitBtn = document.getElementById('submitBtn');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        loadingMessage.classList.add('hidden');
    }

    function showLoading() {
        loadingMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
    }

    function hideLoading() {
        loadingMessage.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Basic validation
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            showError('Please enter a valid email address');
            return;
        }

        showLoading();

        try {
            // Call authentication API
            const apiResponse = await fetch('/api/user/login', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!apiResponse.ok) {
                if (apiResponse.status === 501) {
                    throw new Error('Development server does not support PUT requests. Backend API integration required.');
                }
                throw new Error(`API error: ${apiResponse.status}`);
            }

            const response = await apiResponse.json();

            if (response.valid) {
                // Set session cookies
                CookieHelpers.setSession(response.login_session_token, email);
                
                // Redirect to main page
                window.location.href = '../main/mainPage.html';
            } else {
                showError('Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Check if this is a network/API error (expected in development)
            if (error.message.includes('Development server') || error.message.includes('Backend API integration required')) {
                showError('Backend API not available. This is expected behavior until the backend server is running.');
            } else {
                showError('Login failed. Please try again.');
            }
        } finally {
            hideLoading();
        }
    });

    // Note: Replace with real backend authentication
    const apiNote = document.createElement('div');
    apiNote.className = 'mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600';
    apiNote.innerHTML = `
        <strong>Note:</strong> This frontend is ready for backend integration.<br>
        API endpoint: PUT /api/user/login<br>
        Payload: { email, password }
    `;
    loginForm.appendChild(apiNote);
});