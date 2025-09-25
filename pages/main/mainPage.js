// Main dashboard page functionality
document.addEventListener('DOMContentLoaded', async function() {
 
    // Check authentication
    if (!CookieHelpers.isLoggedIn()) {
        window.location.href = '../login/loginPage.html';
        return;
    }

    // Initialize page
    const session = CookieHelpers.getSession();
    document.getElementById('userGreeting').textContent = `Hello, ${session.email}`;

    // State management
    let currentFilters = {
        scheme: '',
        branch: '',
        sem: '',
        subject: ''
    };
    let pagination = {
        limit: 20,
        offset: 0,
        total: 0
    };

    // DOM Elements
    const schemeFilter = document.getElementById('schemeFilter');
    const branchFilter = document.getElementById('branchFilter');
    const semFilter = document.getElementById('semFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const logoutBtn = document.getElementById('logoutBtn');
    const documentsGrid = document.getElementById('documentsGrid');
    const loadingState = document.getElementById('loadingState');
    const noResultsState = document.getElementById('noResultsState');
    const documentCount = document.getElementById('documentCount');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const filterInfo = document.getElementById('filterInfo');

    // Initialize filters
    await loadSchemes();
    await loadBranches();
    loadDocuments();

    // Event Listeners
    schemeFilter.addEventListener('change', handleSchemeChange);
    branchFilter.addEventListener('change', handleBranchChange);
    semFilter.addEventListener('change', handleSemChange);
    subjectFilter.addEventListener('change', handleSubjectChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    logoutBtn.addEventListener('click', handleLogout);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));

    // Load schemes dropdown
    async function loadSchemes() {
        try {
            const response = await fetch('/api/explore/getscheme');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const schemes = data.strArr;
            console.log('Loaded schemes:', schemes);
            
            schemeFilter.innerHTML = '<option value="">All Schemes</option>';
            schemes.forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme;
                option.textContent = scheme;
                schemeFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading schemes:', error);
            schemeFilter.innerHTML = '<option value="">Error loading schemes</option>';
        }
    }

    // Load branches dropdown
    async function loadBranches() {
        try {
            const response = await fetch('/api/explore/getbranch');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const branches = data.branchArr;
            console.log('Loaded branches:', branches);
            
            branchFilter.innerHTML = '<option value="">All Branches</option>';
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branchid;
                option.textContent = branch.branchName;
                branchFilter.appendChild(option);
            });
            branchFilter.disabled = false;
        } catch (error) {
            console.error('Error loading branches:', error);
            branchFilter.innerHTML = '<option value="">Error loading branches</option>';
        }
    }

    // Load subjects based on scheme, branch and semester
    async function loadSubjects(branchId, sem) {
        // Clear subject filter first
        subjectFilter.innerHTML = '<option value="">Select Subject</option>';
        subjectFilter.disabled = true;
        
        // Need both scheme, branch and semester to load subjects
        if (!currentFilters.scheme || !branchId || !sem) {
            return;
        }

        try {
            // Fixed: Use correct parameter names and include all required parameters
            const subjectResponse = await fetch(`/api/explore/getsub?scheme_id=${currentFilters.scheme}&branch_id=${branchId}&sem=${sem}`);
            if (!subjectResponse.ok) {
                throw new Error(`HTTP error! status: ${subjectResponse.status}`);
            }
            
            const data = await subjectResponse.json();
            const subjects = data.subjectArr;
            console.log('Loaded subjects:', subjects);
            
            subjectFilter.innerHTML = '<option value="">All Subjects</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subjectid || subject.subjectID; // Handle both cases
                option.textContent = subject.subjectName || subject.subjectName; // Handle both cases
                subjectFilter.appendChild(option);
            });
            subjectFilter.disabled = false;
        } catch (error) {
            console.error('Error loading subjects:', error);
            subjectFilter.innerHTML = '<option value="">Error loading subjects</option>';
        }
    }

    // Filter event handlers
    function handleSchemeChange() {
        currentFilters.scheme = schemeFilter.value;
        
        // Clear dependent filters when scheme changes
        currentFilters.subject = '';
        subjectFilter.value = '';
        subjectFilter.innerHTML = '<option value="">Select Subject</option>';
        subjectFilter.disabled = true;
        
        // Reload subjects if branch and sem are selected
        if (currentFilters.branch && currentFilters.sem) {
            loadSubjects(currentFilters.branch, currentFilters.sem);
        }
        
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    function handleBranchChange() {
        const selectedBranchId = branchFilter.value;
        currentFilters.branch = selectedBranchId;
        
        // Clear dependent filters when branch changes
        currentFilters.subject = '';
        subjectFilter.value = '';
        
        // Load subjects if scheme and semester are also selected
        loadSubjects(selectedBranchId, currentFilters.sem);
        
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    function handleSemChange() {
        currentFilters.sem = semFilter.value;
        
        // Clear dependent filters when semester changes
        currentFilters.subject = '';
        subjectFilter.value = '';
        
        // Load subjects if scheme and branch are also selected
        loadSubjects(currentFilters.branch, currentFilters.sem);
        
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    function handleSubjectChange() {
        currentFilters.subject = subjectFilter.value;
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    // Save filter preferences to cookies
    function saveFilterPreferences() {
        CookieHelpers.setFilterPreferences(
            currentFilters.scheme,
            currentFilters.branch,
            currentFilters.subject,
            currentFilters.sem
        );
    }

    // Clear all filters
    function clearAllFilters() {
        schemeFilter.value = '';
        branchFilter.value = '';
        semFilter.value = '';
        subjectFilter.value = '';
        
        currentFilters = { scheme: '', branch: '', sem: '', subject: '' };
        subjectFilter.disabled = true;
        
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    // Update filter info display
    function updateFilterInfo() {
        const activeFilters = [];
        if (currentFilters.scheme) activeFilters.push(`Scheme: ${currentFilters.scheme}`);
        if (currentFilters.branch) {
            // Get branch name for display
            const selectedBranchOption = branchFilter.querySelector(`option[value="${currentFilters.branch}"]`);
            const branchName = selectedBranchOption ? selectedBranchOption.textContent : currentFilters.branch;
            activeFilters.push(`Branch: ${branchName}`);
        }
        if (currentFilters.sem) activeFilters.push(`Semester: ${currentFilters.sem}`);
        if (currentFilters.subject) {
            // Get subject name for display
            const selectedSubjectOption = subjectFilter.querySelector(`option[value="${currentFilters.subject}"]`);
            const subjectName = selectedSubjectOption ? selectedSubjectOption.textContent : currentFilters.subject;
            activeFilters.push(`Subject: ${subjectName}`);
        }
        
        filterInfo.textContent = activeFilters.length > 0 
            ? `Active filters: ${activeFilters.join(', ')}` 
            : 'No filters applied';
    }

    // Load documents with current filters and pagination
    async function loadDocuments() {
        showLoading();
        
        try {
            const params = new URLSearchParams({ 
                limit: pagination.limit,
                offset: pagination.offset
            });
            if (currentFilters.scheme) params.append('scheme', currentFilters.scheme);
            if (currentFilters.branch) params.append('branch', currentFilters.branch);
            if (currentFilters.sem) params.append('sem', currentFilters.sem);
            if (currentFilters.subject) params.append('subject', currentFilters.subject);

            const response = await fetch(`/api/explore?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            // Fixed: Handle the actual API response structure (array, not object with materials property)
            const materials = Array.isArray(data) ? data : [];
            pagination.total = materials.length;
            
            updatePaginationControls();
            updateDocumentCount();
            
            if (materials.length === 0) {
                showNoResults();
            } else {
                displayDocuments(materials);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            showError('Failed to load documents. Please try again.');
        }
    }

    // Display documents in grid
    function displayDocuments(documents) {
        hideLoading();
        hideNoResults();
        
        // Fixed: Map backend field names to frontend display
        documentsGrid.innerHTML = documents.map(doc => `
            <div class="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow" data-testid="card-document-${doc.materialId || doc.MaterialId}">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-semibold text-gray-900 text-lg" data-testid="text-document-title">${doc.title || doc.Title}</h3>
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded" data-testid="badge-file-type">${doc.fileType || doc.FileType}</span>
                </div>
                <div class="text-sm text-gray-600 space-y-1 mb-4">
                    <div><strong>Publisher:</strong> ${doc.uploadedUser || doc.UploadedUser}</div>
                    <div><strong>Scheme:</strong> ${doc.schemeId || doc.SchemeId}</div>
                    <div><strong>Branch:</strong> ${doc.branchId || doc.BranchId}</div>
                    <div><strong>Semester:</strong> ${doc.sem || doc.Sem}</div>
                    <div><strong>Subject:</strong> ${doc.subjectId || doc.SubjectId}</div>
                    <div><strong>Uploaded:</strong> ${new Date(doc.uploadedAt || doc.UploadedAt).toLocaleDateString()}</div>
                </div>
                <button 
                    onclick="previewDocument(${doc.materialId || doc.MaterialId})" 
                    class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                    data-testid="button-preview-${doc.materialId || doc.MaterialId}"
                >
                    Preview
                </button>
            </div>
        `).join('');
    }

    // Preview document function (global scope)
    window.previewDocument = function(docId) {
        console.log('Previewing document:', docId);
        // Store docId in sessionStorage for titlePage
        sessionStorage.setItem('selectedDocId', docId);
        
        // Alternative: URL parameter approach
        window.location.href = `../title/titlePage.html?docId=${docId}`;
    };

    // Pagination functions
    function resetPagination() {
        pagination.offset = 0;
    }

    function changePage(direction) {
        const newOffset = pagination.offset + (direction * pagination.limit);
        if (newOffset >= 0 && newOffset < pagination.total) {
            pagination.offset = newOffset;
            loadDocuments();
        }
    }

    function updatePaginationControls() {
        const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
        const totalPages = Math.ceil(pagination.total / pagination.limit);
        
        paginationInfo.textContent = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'No pages';
        
        prevPageBtn.disabled = pagination.offset === 0;
        nextPageBtn.disabled = pagination.offset + pagination.limit >= pagination.total;
    }

    function updateDocumentCount() {
        if (pagination.total === 0) {
            documentCount.textContent = 'No documents found';
        } else {
            const start = pagination.offset + 1;
            const end = Math.min(pagination.offset + pagination.limit, pagination.total);
            documentCount.textContent = `Showing ${start}-${end} of ${pagination.total} documents`;
        }
    }

    // UI state functions
    function showLoading() {
        loadingState.classList.remove('hidden');
        documentsGrid.classList.add('hidden');
        noResultsState.classList.add('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
        documentsGrid.classList.remove('hidden');
    }

    function showNoResults() {
        hideLoading();
        noResultsState.classList.remove('hidden');
        documentsGrid.classList.add('hidden');
    }

    function hideNoResults() {
        noResultsState.classList.add('hidden');
    }

    function showError(message) {
        hideLoading();
        documentsGrid.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-600" data-testid="text-error">
                ${message}
            </div>
        `;
    }

    // Logout functionality
    async function handleLogout() {
        try {
            const session = CookieHelpers.getSession();
            await fetch('/api/user/logout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.email })
            });
            
            CookieHelpers.clearSession();
            window.location.href = '../login/loginPage.html';
        } catch (error) {
            console.error('Error during logout:', error);
            // Clear session anyway and redirect
            CookieHelpers.clearSession();
            window.location.href = '../login/loginPage.html';
        }
    }
});