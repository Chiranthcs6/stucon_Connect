// Cookie management utilities for Stucon application
// All cookies use path=/ and expire in 24 hours

const CookieHelpers = {
    // Set cookie with 24-hour expiration
    setCookie(name, value, path = '/') {
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;
    },

    // Get cookie value
    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    },

    // Delete cookie
    deleteCookie(name, path = '/') {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    },

    // Session management helpers
    setSession(sessionToken, userEmail) {
        this.setCookie('stucon_session', sessionToken);
        this.setCookie('stucon_userEmail', userEmail);
    },

    getSession() {
        return {
            token: this.getCookie('stucon_session'),
            email: this.getCookie('stucon_userEmail')
        };
    },

    clearSession() {
        this.deleteCookie('stucon_session');
        this.deleteCookie('stucon_userEmail');
        this.deleteCookie('stucon_scheme');
        this.deleteCookie('stucon_branch');
        this.deleteCookie('stucon_subject');
        this.deleteCookie('stucon_sem');
    },

    isLoggedIn() {
        const session = this.getSession();
        return !!(session.token && session.email);
    },

    // Filter preferences
    setFilterPreferences(scheme, branch, subject, sem) {
        if (scheme) this.setCookie('stucon_scheme', scheme);
        if (branch) this.setCookie('stucon_branch', branch);
        if (subject) this.setCookie('stucon_subject', subject);
        if (sem) this.setCookie('stucon_sem', sem);
    },

    getFilterPreferences() {
        return {
            scheme: this.getCookie('stucon_scheme'),
            branch: this.getCookie('stucon_branch'),
            subject: this.getCookie('stucon_subject'),
            sem: this.getCookie('stucon_sem')
        };
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CookieHelpers = CookieHelpers;
}