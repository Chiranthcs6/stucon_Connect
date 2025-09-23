// Upload page functionality - handles document upload with form validation
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!CookieHelpers.isLoggedIn()) {
        window.location.href = '../login/loginPage.html';
        return;
    }

    // DOM elements
    const uploadForm = document.getElementById('uploadForm');
    const schemeSelect = document.getElementById('scheme');
    const branchSelect = document.getElementById('branch');
    const semesterSelect = document.getElementById('semester');
    const subjectSelect = document.getElementById('subject');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loadingMessage = document.getElementById('loadingMessage');
    const submitBtn = document.getElementById('submitBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // State
    let schemes = [];
    let branches = [];

    // Initialize page
    await loadDropdownData();
    loadSavedPreferences();
    setupEventListeners();

    async function loadDropdownData() {
        try {
            // Load schemes
            const schemesResponse = await fetch('/api/explore/getscheme');
            schemes = await schemesResponse.json();
            
            schemeSelect.innerHTML = '<option value="">Select Scheme</option>';
            schemes.forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme.schemeID;
                option.textContent = scheme.schemeName;
                schemeSelect.appendChild(option);
            });

            // Load branches
            const branchesResponse = await fetch('/api/explore/getbranch');
            branches = await branchesResponse.json();
            
            branchSelect.innerHTML = '<option value="">Select Branch</option>';
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branchID;
                option.textContent = branch.branchName;
                branchSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading dropdown data:', error);
            showError('Failed to load form data. Please refresh the page.');
        }
    }

    function loadSavedPreferences() {
        const preferences = CookieHelpers.getFilterPreferences();
        
        // Auto-fill dropdowns from saved preferences
        if (preferences.scheme) {
            const schemeOption = Array.from(schemeSelect.options).find(opt => opt.textContent === preferences.scheme);
            if (schemeOption) schemeSelect.value = schemeOption.value;
        }
        
        if (preferences.branch) {
            const branchOption = Array.from(branchSelect.options).find(opt => opt.textContent === preferences.branch);
            if (branchOption) branchSelect.value = branchOption.value;
        }
        
        if (preferences.sem) {
            semesterSelect.value = preferences.sem;
        }
        
        // Load subjects if branch and semester are selected
        if (branchSelect.value && semesterSelect.value) {
            loadSubjects(branchSelect.value, semesterSelect.value);
        }
    }

    function setupEventListeners() {
        // Dropdown change handlers
        branchSelect.addEventListener('change', handleBranchChange);
        semesterSelect.addEventListener('change', handleSemesterChange);
        
        // File input handler
        fileInput.addEventListener('change', handleFileSelect);
        
        // Form submission
        uploadForm.addEventListener('submit', handleFormSubmit);
        
        // Logout handler
        logoutBtn.addEventListener('click', handleLogout);
    }

    function handleBranchChange() {
        const branchId = branchSelect.value;
        const sem = semesterSelect.value;
        
        if (branchId && sem) {
            loadSubjects(branchId, sem);
        } else {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            subjectSelect.disabled = true;
        }
    }

    function handleSemesterChange() {
        const branchId = branchSelect.value;
        const sem = semesterSelect.value;
        
        if (branchId && sem) {
            loadSubjects(branchId, sem);
        } else {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            subjectSelect.disabled = true;
        }
    }

    async function loadSubjects(branchId, sem) {
        try {
            const response = await fetch(`/api/explore/getsub?branch-id=${branchId}&sem=${sem}`);
            const subjects = await response.json();
            
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subjectID;
                option.textContent = subject.subjectName;
                subjectSelect.appendChild(option);
            });
            subjectSelect.disabled = false;

            // Auto-select if matches saved preference
            const preferences = CookieHelpers.getFilterPreferences();
            if (preferences.subject) {
                const subjectOption = Array.from(subjectSelect.options).find(opt => opt.textContent === preferences.subject);
                if (subjectOption) subjectSelect.value = subjectOption.value;
            }

        } catch (error) {
            console.error('Error loading subjects:', error);
            subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
        }
    }

    function handleFileSelect() {
        const file = fileInput.files[0];
        if (file) {
            const fileSize = (file.size / 1024 / 1024).toFixed(2); // Convert to MB
            fileInfo.innerHTML = `
                <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span><strong>${file.name}</strong> (${fileSize} MB)</span>
                </div>
            `;
            fileInfo.classList.remove('hidden');
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }

        showLoading();

        try {
            const formData = new FormData();
            const file = fileInput.files[0];
            formData.append('file', file);

            // Get form values
            const title = document.getElementById('title').value.trim();
            const description = document.getElementById('description').value.trim();
            const schemeId = schemeSelect.value;
            const branchId = branchSelect.value;
            const sem = semesterSelect.value;
            const subjectId = subjectSelect.value;
            const fileType = file.name.split('.').pop().toUpperCase();

            // Build query parameters
            const queryParams = new URLSearchParams({
                user_id: '1', // This should come from user session in real app
                scheme_id: schemeId,
                branch_id: branchId,
                subject_id: subjectId,
                sem: sem,
                title: title,
                file_type: fileType
            });

            // Upload file
            const response = await fetch(`/api/upload?${queryParams}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: file
            });

            if (response.ok) {
                showSuccess('Document uploaded successfully!');
                
                // Clear form
                uploadForm.reset();
                fileInfo.classList.add('hidden');
                subjectSelect.disabled = true;
                
                // Redirect to main page after 2 seconds
                setTimeout(() => {
                    window.location.href = '../main/mainPage.html';
                }, 2000);
            } else {
                throw new Error('Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            showError('Upload failed. Please try again.');
        } finally {
            hideLoading();
        }
    }

    function validateForm() {
        const title = document.getElementById('title').value.trim();
        const file = fileInput.files[0];
        
        if (!title) {
            showError('Please enter a document title');
            return false;
        }
        
        if (!schemeSelect.value) {
            showError('Please select a scheme');
            return false;
        }
        
        if (!branchSelect.value) {
            showError('Please select a branch');
            return false;
        }
        
        if (!semesterSelect.value) {
            showError('Please select a semester');
            return false;
        }
        
        if (!subjectSelect.value) {
            showError('Please select a subject');
            return false;
        }
        
        if (!file) {
            showError('Please select a file to upload');
            return false;
        }
        
        // Validate file type
        const allowedTypes = ['pdf', 'doc', 'docx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            showError('Please upload a PDF, DOC, or DOCX file');
            return false;
        }
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showError('File size must be less than 10MB');
            return false;
        }
        
        return true;
    }

    // Message display functions
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
        submitBtn.textContent = 'Uploading...';
    }

    function hideLoading() {
        loadingMessage.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Document';
    }

    async function handleLogout() {
        try {
            const session = CookieHelpers.getSession();
            await fetch('/api/user/logout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.email, token: session.token })
            });
            
            CookieHelpers.clearSession();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            CookieHelpers.clearSession();
            window.location.href = '../../index.html';
        }
    }
});