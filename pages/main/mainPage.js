// Basic Document Filter System
console.log('Document filter system loaded');

// Global variables for current filter selections
let currentScheme = '';
let currentBranch = '';
let currentSemester = '';
let currentSubject = '';

// Data storage
let schemes = [];
let branches = [];
let subjects = [];
let documents = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing document filter system...');
    /*
    // Wait for scripts to load, then check authentication
    if (!window.AccessControl || !window.SessionManager) {
        console.log('Authentication scripts not loaded, redirecting to login');
        window.location.href = '../login/loginPage.html';
        return;
    }
    
    // Check authentication - redirect to login if not authenticated
    if (!window.AccessControl.requireAuthentication()) {
        return;
    }
    */
    // Load user session and update greeting
    loadUserSession();
    
    // Set up event listeners
    bindEventListeners();
    
    // Load initial data
    await loadSchemes();
    await loadBranches();
    await loadAllDocuments();
    
    console.log('Document filter system initialized');
});

// Load user session and update greeting
function loadUserSession() {
    const username = window.SessionManager.getUsername();
    const userGreeting = document.getElementById('userGreeting');
    
    if (username && userGreeting) {
        userGreeting.textContent = `Hello, ${username}`;
        console.log('User session loaded:', username);
    } else {
        console.log('Failed to load user session');
        userGreeting.textContent = 'Hello, User';
    }
}

// Bind all event listeners
function bindEventListeners() {
    document.getElementById('schemeFilter').addEventListener('change', handleSchemeChange);
    document.getElementById('branchFilter').addEventListener('change', handleBranchChange);
    document.getElementById('semFilter').addEventListener('change', handleSemesterChange);
    document.getElementById('subjectFilter').addEventListener('change', handleSubjectChange);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('uploadBtn').addEventListener('click', handleUpload);
}

// Load schemes from API on page load
async function loadSchemes() {
    try {
        console.log('Loading schemes...');
        showLoading();
        
        const response = await fetch('/api/explore/schemes');
        if (!response.ok) throw new Error('Failed to load schemes');
        
        const data = await response.json();
        schemes = data.strArr || [];
        
        const select = document.getElementById('schemeFilter');
        select.innerHTML = '<option value="">All Schemes</option>';
        
        schemes.forEach(scheme => {
            const option = document.createElement('option');
            option.value = scheme;
            option.textContent = scheme;
            select.appendChild(option);
        });
        
        console.log('Schemes loaded:', schemes.length);
    } catch (error) {
        console.error('Error loading schemes:', error);
        showError('Failed to load schemes');
    }
}

// Load branches from API on page load
async function loadBranches() {
    try {
        console.log('Loading branches...');
        
        const response = await fetch('/api/explore/branches');
        if (!response.ok) throw new Error('Failed to load branches');
        
        const data = await response.json();
        branches = data.branchArr || [];
        
        const select = document.getElementById('branchFilter');
        select.innerHTML = '<option value="">All Branches</option>';
        
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.branch_id;
            option.textContent = branch.branch_name;
            select.appendChild(option);
        });
        
        console.log('Branches loaded:', branches.length);
    } catch (error) {
        console.error('Error loading branches:', error);
        showError('Failed to load branches');
    }
}

// Load subjects dynamically based on scheme + branch + semester
async function loadSubjects(scheme, branch, semester) {
    const select = document.getElementById('subjectFilter');
    select.innerHTML = '<option value="">Select Subject</option>';
    
    if (!scheme || !branch || !semester) {
        select.disabled = true;
        subjects = [];
        return;
    }
    
    try {
        console.log('Loading subjects for:', { scheme, branch, semester });
        
        const params = new URLSearchParams({
            scheme: scheme,
            branch: branch,
            sem: semester
        });
        
        const response = await fetch(`/api/explore/subjects?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to load subjects');
        
        const data = await response.json();
        subjects = data.subjectArr || [];
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.subject_id;
            option.textContent = subject.subject_name;
            select.appendChild(option);
        });
        
        select.disabled = subjects.length === 0;
        console.log('Subjects loaded:', subjects.length);
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        select.disabled = true;
        subjects = [];
    }
}

// Load all documents initially
async function loadAllDocuments() {
    try {
        console.log('Loading all documents...');
        showLoading();
        
        const response = await fetch('/api/explore/documents');
        if (!response.ok) throw new Error('Failed to load documents');
        
        const data = await response.json();
        documents = data.docArr || [];
        
        displayDocuments(documents);
        updateDocumentCount(documents.length);
        
        console.log('All documents loaded:', documents.length);
    } catch (error) {
        console.error('Error loading documents:', error);
        showError('Failed to load documents');
    }
}

// Load filtered documents based on current selections
async function loadFilteredDocuments() {
    try {
        console.log('Loading filtered documents...', {
            scheme: currentScheme,
            branch: currentBranch,
            semester: currentSemester,
            subject: currentSubject
        });
        
        showLoading();
        
        const params = new URLSearchParams();
        if (currentScheme) params.append('scheme', currentScheme);
        if (currentBranch) params.append('branch', currentBranch);
        if (currentSemester) params.append('sem', currentSemester);
        if (currentSubject) params.append('subject', currentSubject);
        
        const response = await fetch(`/api/explore/documents?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to load documents');
        
        const data = await response.json();
        documents = data.docArr || [];
        
        displayDocuments(documents);
        updateDocumentCount(documents.length);
        
        console.log('Filtered documents loaded:', documents.length);
    } catch (error) {
        console.error('Error loading filtered documents:', error);
        showError('Failed to load documents');
    }
}

// Event handlers
async function handleSchemeChange(event) {
    currentScheme = event.target.value;
    console.log('Scheme changed to:', currentScheme);
    
    // Reset dependent filters
    currentBranch = '';
    currentSemester = '';
    currentSubject = '';
    
    document.getElementById('branchFilter').value = '';
    document.getElementById('semFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('subjectFilter').disabled = true;
    
    // Load filtered documents
    if (currentScheme) {
        await loadFilteredDocuments();
    } else {
        await loadAllDocuments();
    }
    
    updateFilterInfo();
}

async function handleBranchChange(event) {
    currentBranch = event.target.value;
    console.log('Branch changed to:', currentBranch);
    
    // Reset dependent filters
    currentSubject = '';
    document.getElementById('subjectFilter').value = '';
    
    // Load subjects if all three filters are selected
    if (currentScheme && currentBranch && currentSemester) {
        await loadSubjects(currentScheme, currentBranch, currentSemester);
    } else {
        document.getElementById('subjectFilter').disabled = true;
    }
    
    // Load filtered documents
    await loadFilteredDocuments();
    updateFilterInfo();
}

async function handleSemesterChange(event) {
    currentSemester = event.target.value;
    console.log('Semester changed to:', currentSemester);
    
    // Reset dependent filters
    currentSubject = '';
    document.getElementById('subjectFilter').value = '';
    
    // Load subjects if all three filters are selected
    if (currentScheme && currentBranch && currentSemester) {
        await loadSubjects(currentScheme, currentBranch, currentSemester);
    } else {
        document.getElementById('subjectFilter').disabled = true;
    }
    
    // Load filtered documents
    await loadFilteredDocuments();
    updateFilterInfo();
}

async function handleSubjectChange(event) {
    currentSubject = event.target.value;
    console.log('Subject changed to:', currentSubject);
    
    // Load filtered documents
    await loadFilteredDocuments();
    updateFilterInfo();
}

// Clear all filters
async function clearAllFilters() {
    console.log('Clearing all filters...');
    
    // Reset filter values
    currentScheme = '';
    currentBranch = '';
    currentSemester = '';
    currentSubject = '';
    
    // Reset UI
    document.getElementById('schemeFilter').value = '';
    document.getElementById('branchFilter').value = '';
    document.getElementById('semFilter').value = '';
    document.getElementById('subjectFilter').value = '';
    document.getElementById('subjectFilter').disabled = true;
    
    // Load all documents
    await loadAllDocuments();
    updateFilterInfo();
}

// Display documents as content cards
function displayDocuments(docs) {
    hideLoading();
    
    const grid = document.getElementById('documentsGrid');
    
    if (!docs || docs.length === 0) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    grid.innerHTML = docs.map(doc => `
        <div class="document-card" data-testid="card-document-${doc.document_id}">
            <div class="document-header">
                <h3 class="document-title" data-testid="text-title-${doc.document_id}">${doc.title}</h3>
                <span class="document-badge" data-testid="badge-filetype-${doc.document_id}">${doc.type || 'PDF'}</span>
            </div>
            <div class="document-details">
                <div><strong>Publisher:</strong> ${doc.publisher || 'Unknown'}</div>
                <div><strong>Scheme:</strong> ${doc.scheme}</div>
                <div><strong>Branch:</strong> ${doc.branch_name || doc.branch}</div>
                <div><strong>Semester:</strong> ${doc.semester || doc.sem}</div>
                <div><strong>Subject:</strong> ${doc.subject_name || doc.subject}</div>
                <div><strong>Uploaded:</strong> ${new Date(doc.created_at).toLocaleDateString()}</div>
                <div><strong>Downloads:</strong> ${doc.downloads || 0}</div>
            </div>
            <button 
                onclick="previewDocument('${doc.document_id}')" 
                class="btn btn-primary document-preview-btn"
                data-testid="button-preview-${doc.document_id}"
            >
                Preview
            </button>
        </div>
    `).join('');
}

// Preview document function
function previewDocument(docId) {
    console.log('Preview document:', docId);
    // Simple alert for now - can be enhanced with modal
    alert(`Preview document ${docId}`);
}

// Update filter info display
function updateFilterInfo() {
    const activeFilters = [];
    if (currentScheme) activeFilters.push(`Scheme: ${currentScheme}`);
    if (currentBranch) {
        const branchName = branches.find(b => b.branch_id === currentBranch)?.branch_name || currentBranch;
        activeFilters.push(`Branch: ${branchName}`);
    }
    if (currentSemester) activeFilters.push(`Semester: ${currentSemester}`);
    if (currentSubject) {
        const subjectName = subjects.find(s => s.subject_id === currentSubject)?.subject_name || currentSubject;
        activeFilters.push(`Subject: ${subjectName}`);
    }
    
    const info = activeFilters.length > 0 
        ? `Active filters: ${activeFilters.join(', ')}` 
        : 'No filters applied';
        
    document.getElementById('filterInfo').textContent = info;
}

// Update document count display
function updateDocumentCount(count) {
    document.getElementById('documentCount').textContent = `${count} documents found`;
}

// UI State Management
function showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('noResultsState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('documentsGrid').innerHTML = '';
}

function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
}

function showNoResults() {
    document.getElementById('noResultsState').classList.remove('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('documentsGrid').innerHTML = '';
}

function hideNoResults() {
    document.getElementById('noResultsState').classList.add('hidden');
}

function showError(message) {
    const errorState = document.getElementById('errorState');
    errorState.classList.remove('hidden');
    errorState.querySelector('.error-text').textContent = message;
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('noResultsState').classList.add('hidden');
    document.getElementById('documentsGrid').innerHTML = '';
    console.error(message);
}

// Navigation handlers
function handleLogout() {
    console.log('Logout clicked');
    
    // Clear session first
    if (window.SessionManager) {
        window.SessionManager.clearSession();
        console.log('Session cleared');
    }
    
    // Then redirect to login
    window.location.href = '../login/loginPage.html';
}

function handleUpload() {
    console.log('Upload clicked');
    window.location.href = '../upload/uploadPage.html';
}