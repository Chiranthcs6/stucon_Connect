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
            const data = await response.json();
            const schemes = data.strArr; // get the array from inside the object
            console.log(schemes);
            schemeFilter.innerHTML = '<option value=\"\">All Schemes</option>';
            schemes.forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme;
                option.textContent = scheme;
                schemeFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading schemes:', error);
        }
    }

    // Load branches dropdown
    async function loadBranches() {
        try {
            const response = await fetch('/api/explore/getbranch');
            const data = await response.json();
            const branches = data.branchArr;
            console.log(branches);
            branchFilter.innerHTML = '<option value=\"\">All Branches</option>';
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branchID;
                option.textContent = branch.branchName;
                branchFilter.appendChild(option);
            });
            branchFilter.disabled = false;
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    // Load subjects based on branch and semester
    async function loadSubjects(branchName, sem) {
        if (!branchName || !sem) {
            subjectFilter.innerHTML = '<option value=\"\">Select Subject</option>';
            subjectFilter.disabled = true;
            return;
        }

        try {
            // Get branch ID from branch name
            const response = await fetch('/api/explore/getbranch');
            const branchData = await response.json();
            const branches = branchData.branchArr;
            const branch = branches.find(b => b.branchName === branchName);
            console.log(branches);
            if (!branch) return;
            

            const subjectResponse = await fetch(`/api/explore/getsub?branch-id=${branch.branchID}&sem=${sem}`);
            const subjectData = await subjectResponse.json();
            const subjects=subjectData.subjectArr;
            console.log(subjects);
            subjectFilter.innerHTML = '<option value=\"\">All Subjects</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subjectName;
                option.textContent = subject.subjectName;
                subjectFilter.appendChild(option);
            });
            subjectFilter.disabled = false;
        } catch (error) {
            console.error('Error loading subjects:', error);
            subjectFilter.innerHTML = '<option value=\"\">Error loading subjects</option>';
        }
    }

    // Filter event handlers
    function handleSchemeChange() {
        currentFilters.scheme = schemeFilter.value;
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    function handleBranchChange() {
        currentFilters.branch = branchFilter.value;
        loadSubjects(currentFilters.branch, currentFilters.sem);
        saveFilterPreferences();
        resetPagination();
        loadDocuments();
        updateFilterInfo();
    }

    function handleSemChange() {
        currentFilters.sem = semFilter.value;
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
        if (currentFilters.branch) activeFilters.push(`Branch: ${currentFilters.branch}`);
        if (currentFilters.sem) activeFilters.push(`Semester: ${currentFilters.sem}`);
        if (currentFilters.subject) activeFilters.push(`Subject: ${currentFilters.subject}`);
        
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
            const data = await response.json();

            pagination.total = data.total || data.materials.length;
            updatePaginationControls();
            updateDocumentCount();
            
            if (data.materials.length === 0) {
                showNoResults();
            } else {
                displayDocuments(data.materials);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            showError('Failed to load documents');
        }
    }

    // Display documents in grid
    function displayDocuments(documents) {
        hideLoading();
        hideNoResults();
        
        documentsGrid.innerHTML = documents.map(doc => `
            <div class=\"bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow\">
                <div class=\"flex justify-between items-start mb-3\">
                    <h3 class=\"font-semibold text-gray-900 text-lg\">${doc.title}</h3>
                    <span class=\"text-xs bg-stucon-100 text-stucon-800 px-2 py-1 rounded\">${doc.fileType}</span>
                </div>
                <div class=\"text-sm text-gray-600 space-y-1 mb-4\">
                    <div><strong>Publisher:</strong> ${doc.publisher}</div>
                    <div><strong>Scheme:</strong> ${doc.scheme}</div>
                    <div><strong>Branch:</strong> ${doc.branch}</div>
                    <div><strong>Semester:</strong> ${doc.sem}</div>
                    <div><strong>Subject:</strong> ${doc.subject}</div>
                    <div><strong>Uploaded:</strong> ${new Date(doc.uploadDate).toLocaleDateString()}</div>
                    <div><strong>Downloads:</strong> ${doc.downloads}</div>
                </div>
                <button 
                    onclick=\"previewDocument(${doc.materialID})\" 
                    class=\"w-full btn btn-primary\"
                >
                    Preview
                </button>
            </div>
        `).join('');
    }

    // Preview document function (global scope)
    window.previewDocument = function(docId) {
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
        
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        
        prevPageBtn.disabled = pagination.offset === 0;
        nextPageBtn.disabled = pagination.offset + pagination.limit >= pagination.total;
    }

    function updateDocumentCount() {
        const start = pagination.offset + 1;
        const end = Math.min(pagination.offset + pagination.limit, pagination.total);
        documentCount.textContent = `Showing ${start}-${end} of ${pagination.total} documents`;
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
            <div class=\"col-span-full text-center py-8 text-red-600\">
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
                body: JSON.stringify({ email: session.email, token: session.token })
            });
            CookieHelpers.clearSession();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Clear session anyway
            CookieHelpers.clearSession();
            window.location.href = '../../index.html';
        }
    }
});