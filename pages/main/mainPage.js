// Main dashboard page functionality
console.log('Main page script loaded!');

// Global variables to store current selections
let currentScheme = null;
let currentBranch = null;
let currentSemester = null;
let currentSubject = null;

// Event handlers - define globally to ensure they're accessible
async function handleSchemeChange(event) {
    console.log('Scheme changed:', event.target.value);
    currentScheme = event.target.value;
    
    // Save to cookie
    CookieHelpers.setCookie('selectedScheme', currentScheme, 7);
    console.log('Saved scheme to cookie:', currentScheme);
    
    // Reset dependent dropdowns
    resetBranchSelect();
    resetSemesterSelect(); 
    resetSubjectSelect();
    currentBranch = null;
    currentSemester = null;
    currentSubject = null;
    
    if (currentScheme) {
        // Refetch branches for the selected scheme
        await loadBranches(currentScheme);
        
        // Reload semesters (frontend data)
        loadSemesters();
        
        // Filter documents by scheme only
        await loadDocumentsByFilters();
    } else {
        // If no scheme selected, load all documents
        await loadAllDocuments();
    }
}

async function handleBranchChange(event) {
    console.log('Branch changed:', event.target.value);
    currentBranch = event.target.value;
    
    // Save to cookie
    CookieHelpers.setCookie('selectedBranch', currentBranch, 7);
    console.log('Saved branch to cookie:', currentBranch);
    
    // Reset dependent dropdowns
    resetSubjectSelect();
    currentSubject = null;
    
    // Update document list based on current filters
    await loadDocumentsByFilters();
    
    // Load subjects if scheme, branch AND semester are all selected
    if (currentScheme && currentBranch && currentSemester) {
        await loadSubjects(currentScheme, currentBranch, currentSemester);
    }
}

async function handleSemesterChange(event) {
    console.log('Semester changed:', event.target.value);
    currentSemester = event.target.value;
    
    // Reset dependent dropdowns
    resetSubjectSelect();
    currentSubject = null;
    
    // Update document list based on current filters
    await loadDocumentsByFilters();
    
    // Fetch subjects for (Scheme + Branch + Semester)
    if (currentScheme && currentBranch && currentSemester) {
        await loadSubjects(currentScheme, currentBranch, currentSemester);
    }
}

async function handleSubjectChange(event) {
    console.log('Subject changed:', event.target.value);
    currentSubject = event.target.value;
    
    // Fetch and display documents for (Scheme + Branch + Semester + Subject)
    await loadDocumentsByFilters();
}

// Initialize page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

async function initializePage() {
    console.log('Initializing main page...');
    
    // Check authentication (modified for testing - don't redirect immediately)
    const isLoggedIn = CookieHelpers.isLoggedIn();
    console.log('Authentication status:', isLoggedIn);
    
    if (!isLoggedIn) {
        console.warn('User authentication unclear - proceeding anyway for testing');
        // Don't redirect immediately - allow testing of main functionality
    } else {
        console.log('User is logged in, setting up page...');
    }
    
    // Get DOM elements
    const schemeSelect = document.getElementById('scheme-select');
    const branchSelect = document.getElementById('branch-select');
    const semesterSelect = document.getElementById('semester-select');
    const subjectSelect = document.getElementById('subject-select');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (!schemeSelect || !branchSelect || !semesterSelect || !subjectSelect) {
        console.error('Missing required DOM elements');
        return;
    }
    
    // Set up event listeners
    schemeSelect.addEventListener('change', handleSchemeChange);
    branchSelect.addEventListener('change', handleBranchChange);
    semesterSelect.addEventListener('change', handleSemesterChange);
    subjectSelect.addEventListener('change', handleSubjectChange);
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Load initial data from API and frontend
    console.log('About to load data from API and frontend...');
    await loadSchemes();
    
    console.log('Page initialization complete');
}

// Frontend data for dropdowns (only semesters now)
const FRONTEND_DATA = {
    semesters: ['1', '2', '3', '4', '5', '6', '7', '8']
};

// Data loading functions - schemes and branches from API, semesters from frontend
async function loadSchemes() {
    console.log('Loading schemes from API...');
    try {
        const response = await fetch('/api/explore/schemes');
        console.log('Schemes API response status:', response.status);
        
        const data = await response.json();
        console.log('Schemes response data:', data);
        
        if (response.ok && data.strArr) {
            console.log('Populating schemes with:', data.strArr);
            populateSchemeSelect(data.strArr);
            
            // Auto-select default scheme (prefer 2022, fallback to first)
            let defaultScheme = data.strArr.find(scheme => scheme.includes('2022')) || data.strArr[0];
            
            // Check for saved scheme selection first
            const savedScheme = CookieHelpers.getCookie('selectedScheme');
            if (savedScheme && data.strArr.includes(savedScheme)) {
                defaultScheme = savedScheme;
                console.log('Using saved scheme from cookie:', savedScheme);
            } else if (defaultScheme) {
                console.log('Auto-selecting default scheme:', defaultScheme);
            }
            
            if (defaultScheme) {
                const schemeSelect = document.getElementById('scheme-select');
                if (schemeSelect) {
                    schemeSelect.value = defaultScheme;
                    currentScheme = defaultScheme;
                }
                
                // Load branches for the default scheme
                await loadBranches(defaultScheme);
            }
            
            // Load semesters (frontend data)
            loadSemesters();
            
            // Load all documents initially (no filters)
            await loadAllDocuments();
        } else {
            console.error('Failed to load schemes - response not ok or no strArr:', data);
            showError('Failed to load schemes');
        }
    } catch (error) {
        console.error('Error loading schemes:', error);
        showError('Error loading schemes');
    }
}

async function loadBranches(schemeId) {
    console.log('Loading branches from API for scheme:', schemeId);
    try {
        const response = await fetch(`/api/explore/branches?scheme=${encodeURIComponent(schemeId)}`);
        console.log('Branches API response status:', response.status);
        
        const data = await response.json();
        console.log('Branches response data:', data);
        
        if (response.ok && data.branchArr) {
            console.log('Populating branches with:', data.branchArr);
            populateBranchSelect(data.branchArr);
            
            // Restore saved branch selection if valid
            const savedBranch = CookieHelpers.getCookie('selectedBranch');
            if (savedBranch && data.branchArr.some(branch => branch.branch_id === savedBranch)) {
                console.log('Restoring saved branch from cookie:', savedBranch);
                const branchSelect = document.getElementById('branch-select');
                if (branchSelect) {
                    branchSelect.value = savedBranch;
                    currentBranch = savedBranch;
                }
            }
        } else {
            console.error('Failed to load branches - response not ok or no branchArr:', data);
            showError('Failed to load branches');
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showError('Error loading branches');
    }
}

function loadSemesters() {
    console.log('Loading semesters from frontend data...');
    populateSemesterSelect(FRONTEND_DATA.semesters);
}

// Load all documents initially (no filters applied)
async function loadAllDocuments() {
    console.log('Loading all documents (no filters)...');
    try {
        const response = await fetch('/api/explore/documents');
        console.log('All documents API response status:', response.status);
        
        const data = await response.json();
        console.log('All documents response data:', data);
        
        if (response.ok) {
            if (data.docArr && data.docArr.length > 0) {
                displayDocuments(data.docArr);
            } else {
                // Show "No documents found" when API succeeds but returns empty
                const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
                if (container) {
                    container.innerHTML = `
                        <div class="col-span-full text-center py-8 text-gray-500">
                            <p>No documents found.</p>
                        </div>
                    `;
                }
            }
        } else {
            console.error('Failed to load all documents:', data);
            showError('Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading all documents:', error);
        showError('Failed to load documents');
    }
}

async function loadSubjects(schemeId, branchId, semester) {
    console.log('Loading subjects for:', { schemeId, branchId, semester });
    try {
        const params = new URLSearchParams({
            scheme: schemeId,
            branch: branchId,
            sem: semester
        });
        
        const response = await fetch(`/api/explore/subjects?${params.toString()}`);
        const data = await response.json();
        
        console.log('Subjects response:', data);
        
        if (response.ok && data.subjectArr) {
            populateSubjectSelect(data.subjectArr);
        } else {
            console.error('Failed to load subjects:', data);
            showError('Failed to load subjects');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        showError('Error loading subjects');
    }
}

async function loadDocuments() {
    console.log('Loading documents...');
    
    if (!currentScheme || !currentBranch || !currentSemester || !currentSubject) {
        console.log('Missing required selections for documents');
        return;
    }
    
    try {
        showLoading();
        
        const params = new URLSearchParams({
            scheme: currentScheme,
            branch: currentBranch,
            sem: currentSemester,
            subject: currentSubject
        });
        
        const response = await fetch(`/api/explore/documents?${params.toString()}`);
        const data = await response.json();
        
        console.log('Documents response:', data);
        
        if (response.ok) {
            // API succeeded - show documents or "No documents found"
            displayDocuments(data.documents || []);
        } else {
            // API failed - show error message
            console.error('Failed to load documents:', data);
            showError('Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showError('Error loading documents');
    }
}

// DOM manipulation functions
function populateSchemeSelect(schemes) {
    const select = document.getElementById('scheme-select');
    
    console.log('populateSchemeSelect called with schemes:', schemes);
    console.log('Number of schemes received:', schemes.length);
    console.log('Schemes array:', JSON.stringify(schemes));
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select Scheme</option>';
    
    schemes.forEach((scheme, index) => {
        console.log(`Adding scheme ${index}: ${scheme}`);
        const option = document.createElement('option');
        option.value = scheme;
        option.textContent = scheme;
        select.appendChild(option);
    });
    
    console.log('Final dropdown innerHTML:', select.innerHTML);
    console.log('Populated scheme select with', schemes.length, 'schemes');
}

function populateBranchSelect(branches) {
    const select = document.getElementById('branch-select');
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select Branch</option>';
    
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.branch_id;
        option.textContent = branch.branch_name;
        select.appendChild(option);
    });
    
    select.disabled = false;
    console.log('Populated branch select with', branches.length, 'branches');
}

function populateSemesterSelect(semesters) {
    const select = document.getElementById('semester-select');
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select Semester</option>';
    
    semesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester;
        option.textContent = `Semester ${semester}`;
        select.appendChild(option);
    });
    
    select.disabled = false;
    console.log('Populated semester select with', semesters.length, 'semesters');
}

function populateSubjectSelect(subjects) {
    const select = document.getElementById('subject-select');
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select Subject</option>';
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.subject_id;
        option.textContent = subject.subject_name;
        select.appendChild(option);
    });
    
    select.disabled = false;
    console.log('Populated subject select with', subjects.length, 'subjects');
}

function resetBranchSelect() {
    const select = document.getElementById('branch-select');
    select.innerHTML = '<option value="">Select Branch</option>';
    select.disabled = true;
    currentBranch = null;
}

function resetSemesterSelect() {
    const select = document.getElementById('semester-select');
    select.innerHTML = '<option value="">Select Semester</option>';
    select.disabled = true;
    currentSemester = null;
}

function resetSubjectSelect() {
    const select = document.getElementById('subject-select');
    select.innerHTML = '<option value="">Select Subject</option>';
    select.disabled = true;
    currentSubject = null;
}

// Smart document filtering based on current filter selections
async function loadDocumentsByFilters() {
    console.log('Loading documents with filters:', { 
        scheme: currentScheme, 
        branch: currentBranch, 
        semester: currentSemester, 
        subject: currentSubject 
    });
    
    try {
        let url = '/api/explore/documents';
        const params = new URLSearchParams();
        
        // Add filters based on what's currently selected
        if (currentScheme) params.append('scheme', currentScheme);
        if (currentBranch) params.append('branch', currentBranch);
        if (currentSemester) params.append('sem', currentSemester);
        if (currentSubject) params.append('subject', currentSubject);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('Fetching documents from:', url);
        const response = await fetch(url);
        console.log('Documents API response status:', response.status);
        
        const data = await response.json();
        console.log('Documents response data:', data);
        
        if (response.ok) {
            if (data.docArr && data.docArr.length > 0) {
                displayDocuments(data.docArr);
            } else {
                // Show "No documents found" when API succeeds but returns empty
                const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
                if (container) {
                    container.innerHTML = `
                        <div class="col-span-full text-center py-8 text-gray-500">
                            <p>No documents found for the selected filters.</p>
                        </div>
                    `;
                }
            }
        } else {
            console.error('Failed to load documents with filters:', data);
            showError('Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents with filters:', error);
        showError('Failed to load documents');
    }
}

function displayDocuments(documents) {
    console.log('Displaying', documents.length, 'documents');
    
    const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
    
    if (!container) {
        console.error('Documents container not found');
        return;
    }
    
    hideLoading();
    
    if (documents.length === 0) {
        // Show "No documents found" when API succeeds but returns empty array
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <p>No documents found for the selected filters.</p>
            </div>
        `;
        return;
    }
    
    // Create document cards
    const documentsHTML = documents.map(doc => `
        <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
            <h3 class="font-semibold text-lg mb-2">${doc.title || 'Untitled Document'}</h3>
            <p class="text-gray-600 text-sm mb-2">Subject: ${doc.subject_name || 'Unknown'}</p>
            <p class="text-gray-600 text-sm mb-3">Type: ${doc.type || 'Document'}</p>
            <div class="flex gap-2">
                <button onclick="downloadDocument('${doc.document_id}')" 
                        class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        data-testid="button-download-${doc.document_id}">
                    Download
                </button>
                <button onclick="viewDocument('${doc.document_id}')" 
                        class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        data-testid="button-view-${doc.document_id}">
                    View
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = documentsHTML;
}

function clearDocuments() {
    const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-400">
                <p>Select filters to view documents</p>
            </div>
        `;
    }
}

function showLoading() {
    const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p class="mt-2 text-gray-500">Loading documents...</p>
            </div>
        `;
    }
}

function hideLoading() {
    // Loading state will be replaced by document content
}

function showError(message) {
    hideLoading();
    const container = document.getElementById('documents-grid') || document.getElementById('documents-container');
    if (container) {
        // Only show "Failed to load documents" for actual API failures
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-600">
                <p>${message}</p>
                <p class="text-sm text-gray-500 mt-2">Please try again or check your filters.</p>
            </div>
        `;
    }
}

// Document actions
async function downloadDocument(documentId) {
    console.log('Downloading document:', documentId);
    try {
        const response = await fetch(`/api/explore/download/${documentId}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `document_${documentId}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Failed to download document');
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading document');
    }
}

async function viewDocument(documentId) {
    console.log('Viewing document:', documentId);
    // Implement document viewing logic here
    alert('Document viewing functionality to be implemented');
}

// Logout functionality
async function handleLogout() {
    try {
        const session = CookieHelpers.getSession();
        await fetch('/api/user/logout', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: session.sessionToken })
        });
        
        CookieHelpers.clearSession();
        window.location.href = '../login/loginPage.html';
    } catch (error) {
        console.error('Logout error:', error);
        CookieHelpers.clearSession();
        window.location.href = '../login/loginPage.html';
    }
}

// Make functions globally available for testing
window.testFunctions = {
    loadBranches,
    loadSubjects,
    handleSchemeChange,
    handleBranchChange,
    handleSemesterChange
};

console.log('Main page script setup complete');