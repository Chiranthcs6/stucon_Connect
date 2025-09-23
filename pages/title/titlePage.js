// Title page functionality - displays document details and metadata
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!CookieHelpers.isLoggedIn()) {
        window.location.href = '../login/loginPage.html';
        return;
    }

    // Get document ID from URL parameters or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('docId') || sessionStorage.getItem('selectedDocId');
    
    if (!docId) {
        showError('No document selected');
        return;
    }

    // DOM elements
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const documentDetails = document.getElementById('documentDetails');
    const logoutBtn = document.getElementById('logoutBtn');

    // Load document details
    await loadDocumentDetails(docId);

    // Event listeners
    logoutBtn.addEventListener('click', handleLogout);

    async function loadDocumentDetails(materialId) {
        try {
            showLoading();

            // Fetch document metadata
            const metadataResponse = await fetch(`/api/file/metadata?material-id=${materialId}`);
            const document = await metadataResponse.json();
            
            // For download (not displayed in UI, backend usage only):
            // const downloadUrl = `/api/download?material-id=${materialId}`;
            // Use downloadUrl for backend file download when needed

            if (!document) {
                showError('Document not found');
                return;
            }

            displayDocumentDetails(document);
            setupPreview(document);
            hideLoading();

        } catch (error) {
            console.error('Error loading document details:', error);
            showError('Failed to load document details');
        }
    }

    function displayDocumentDetails(doc) {
        // Update document header
        document.getElementById('documentTitle').textContent = doc.title;
        
        // Update meta information
        const documentMeta = document.getElementById('documentMeta');
        documentMeta.innerHTML = `
            <div>Published by ${doc.publisher}</div>
            <div>${doc.scheme} • ${doc.branch} • Semester ${doc.sem}</div>
            <div>Subject: ${doc.subject}</div>
        `;

        // Update document information
        document.getElementById('fileType').textContent = doc.fileType;
        document.getElementById('uploadDate').textContent = new Date(doc.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('publisher').textContent = doc.publisher;
        document.getElementById('downloads').textContent = doc.downloads + ' downloads';

        // Update academic classification
        document.getElementById('scheme').textContent = doc.scheme;
        document.getElementById('branch').textContent = doc.branch;
        document.getElementById('semester').textContent = `Semester ${doc.sem}`;
        document.getElementById('subject').textContent = doc.subject;
    }

    function setupPreview(doc) {
        const previewContainer = document.getElementById('previewContainer');
        
        if (doc.fileType === 'PDF') {
            previewContainer.innerHTML = `
                <div class="w-full">
                    <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">PDF Document</h3>
                        <p class="text-gray-600 mb-4">
                            PDF preview would be displayed here with backend integration.
                        </p>
                        <div class="text-sm text-gray-500">
                            File size and page count would be shown here.
                        </div>
                    </div>
                </div>
            `;
        } else if (doc.fileType === 'DOCX' || doc.fileType === 'DOC') {
            previewContainer.innerHTML = `
                <div class="w-full">
                    <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Word Document</h3>
                        <p class="text-gray-600 mb-4">
                            Document preview would be displayed here with backend integration.
                        </p>
                        <div class="text-sm text-gray-500">
                            File format: ${doc.fileType}
                        </div>
                    </div>
                </div>
            `;
        } else {
            previewContainer.innerHTML = `
                <div class="w-full">
                    <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">File Preview</h3>
                        <p class="text-gray-600 mb-4">
                            Preview not available for ${doc.fileType} files.
                        </p>
                        <div class="text-sm text-gray-500">
                            File format: ${doc.fileType}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    function showLoading() {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        documentDetails.classList.add('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
        documentDetails.classList.remove('hidden');
    }

    function showError(message) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        documentDetails.classList.add('hidden');
        
        errorState.querySelector('div').textContent = message;
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