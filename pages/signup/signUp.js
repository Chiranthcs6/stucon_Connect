// Signup page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Redirect to dashboard if already logged in
    if (CookieHelpers.isLoggedIn()) {
        window.location.href = '../main/mainPage.html';
        return;
    }

    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loadingMessage = document.getElementById('loadingMessage');
    const submitBtn = document.getElementById('submitBtn');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        loadingMessage.classList.add('hidden');
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        loadingMessage.classList.add('hidden');
    }

    function showLoading() {
        loadingMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }

    function hideLoading() {
        loadingMessage.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }

    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            showError('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        showLoading();

        try {
            // Call authentication API
            const apiResponse = await fetch('/api/user/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (!apiResponse.ok) {
                if (apiResponse.status === 501) {
                    throw new Error('Development server does not support POST requests. Backend API integration required.');
                }
                throw new Error(`API error: ${apiResponse.status}`);
            }

            const response = await apiResponse.json();

            if (response.valid) {
                // Set session cookies
                CookieHelpers.setSession(response.session_token, email);
                
                showSuccess('Account created successfully! Redirecting...');
                
                // Redirect to main page after 2 seconds
                setTimeout(() => {
                    window.location.href = '../main/mainPage.html';
                }, 2000);
            } else {
                showError(response.error || 'Account creation failed. Please try again.');
            }
        } catch (error) {
            console.error('Signup error:', error);
            
            // Check if this is a network/API error (expected in development)
            if (error.message.includes('fetch') || !navigator.onLine) {
                showError('Backend API not available. This is expected behavior until the backend server is running.');
            } else {
                showError('Account creation failed. Please try again.');
            }
        } finally {
            hideLoading();
        }
    });

    // Real-time password confirmation validation
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    function validatePasswordMatch() {
        if (confirmPasswordField.value && passwordField.value !== confirmPasswordField.value) {
            confirmPasswordField.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordField.setCustomValidity('');
        }
    }

    passwordField.addEventListener('input', validatePasswordMatch);
    confirmPasswordField.addEventListener('input', validatePasswordMatch);
});