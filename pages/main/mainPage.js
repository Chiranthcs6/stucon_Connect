// Stucon Document Management System - Improved Main JavaScript
class StuconApp {
    constructor() {
        this.currentFilters = {
            scheme: '',
            branch: '',
            sem: '',
            subject: ''
        };
        
        this.pagination = {
            limit: 20,
            offset: 0,
            total: 0
        };

        // Data will be loaded from API
        this.schemes = [];
        this.branches = [];
        this.subjects = [];
        this.documents = [];
        this.allDocuments = []; // Cache for filtering

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSchemes();
        await this.loadBranches();
        
        // ✅ FIX: Load all documents initially on page start
        await this.loadAllDocuments();
        
        this.updateFilterInfo();
        
        // ✅ FIX: Restore saved filters from cookies
        this.restoreFiltersFromCookies();
    }

    bindEvents() {
        // Filter events
        document.getElementById('schemeFilter').addEventListener('change', () => this.handleSchemeChange());
        document.getElementById('branchFilter').addEventListener('change', () => this.handleBranchChange());
        document.getElementById('semFilter').addEventListener('change', () => this.handleSemChange());
        document.getElementById('subjectFilter').addEventListener('change', () => this.handleSubjectChange());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearAllFilters());
        
        // Navigation events
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('uploadBtn').addEventListener('click', () => this.handleUpload());
        
        // Pagination events
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));
        
        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('previewModal').addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') this.closeModal();
        });
    }

    // ✅ FIX: Updated API endpoints to match working ones
    async loadSchemes() {
        try {
            const response = await fetch('/api/explore/schemes');
            if (!response.ok) throw new Error('Failed to load schemes');
            
            const data = await response.json();
            this.schemes = data.strArr || [];
            
            const select = document.getElementById('schemeFilter');
            select.innerHTML = '<option value="">All Schemes</option>';
            
            this.schemes.forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme;
                option.textContent = scheme;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading schemes:', error);
            this.showError('Failed to load schemes');
        }
    }

    // ✅ FIX: Updated to load branches for specific scheme (consistent API)
    async loadBranches(schemeId = null) {
        try {
            let url = '/api/explore/branches';
            if (schemeId) {
                url += `?scheme=${encodeURIComponent(schemeId)}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load branches');
            
            const data = await response.json();
            this.branches = data.branchArr || [];
            
            const select = document.getElementById('branchFilter');
            select.innerHTML = '<option value="">All Branches</option>';
            
            this.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branch_id;
                option.textContent = branch.branch_name;
                select.appendChild(option);
            });
            
            select.disabled = this.branches.length === 0;
        } catch (error) {
            console.error('Error loading branches:', error);
            this.showError('Failed to load branches');
        }
    }

    // ✅ FIX: Updated API endpoint for subjects
    async loadSubjects(schemeId, branchId, sem) {
        const select = document.getElementById('subjectFilter');
        select.innerHTML = '<option value="">All Subjects</option>';
        
        if (!schemeId || !branchId || !sem) {
            select.disabled = true;
            return;
        }
        
        try {
            const params = new URLSearchParams({
                scheme: schemeId,
                branch: branchId,
                sem: sem
            });
            
            const response = await fetch(`/api/explore/subjects?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load subjects');
            
            const data = await response.json();
            this.subjects = data.subjectArr || [];
            
            this.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subject_id;
                option.textContent = subject.subject_name;
                select.appendChild(option);
            });
            
            select.disabled = this.subjects.length === 0;
        } catch (error) {
            console.error('Error loading subjects:', error);
            select.disabled = true;
        }
    }

    // ✅ FIX: Added initial document loading function
    async loadAllDocuments() {
        console.log('Loading all documents (no filters)...');
        this.showLoading();
        
        try {
            const response = await fetch('/api/explore/documents');
            if (!response.ok) throw new Error('Failed to load documents');
            
            const data = await response.json();
            
            if (data.docArr && data.docArr.length > 0) {
                this.displayDocuments(data.docArr);
                this.pagination.total = data.docArr.length;
            } else {
                this.showNoResults();
            }
            
            this.updateDocumentCount();
        } catch (error) {
            console.error('Error loading all documents:', error);
            this.showError('Failed to load documents. Please try again.');
        }
    }

    async handleSchemeChange() {
        const scheme = document.getElementById('schemeFilter').value;
        this.currentFilters.scheme = scheme;
        
        // ✅ FIX: Save to cookie
        this.setCookie('selectedScheme', scheme, 7);
        console.log('Saved scheme to cookie:', scheme);
        
        // Reset dependent filters
        this.currentFilters.branch = '';
        this.currentFilters.sem = '';
        this.currentFilters.subject = '';
        
        document.getElementById('branchFilter').value = '';
        document.getElementById('semFilter').value = '';
        document.getElementById('subjectFilter').value = '';
        
        // Reload branches for the selected scheme
        if (scheme) {
            await this.loadBranches(scheme);
        }
        
        await this.loadSubjects('', '', '');
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('Scheme changed:', scheme);
    }

    async handleBranchChange() {
        const branch = document.getElementById('branchFilter').value;
        this.currentFilters.branch = branch;
        
        // ✅ FIX: Save to cookie
        this.setCookie('selectedBranch', branch, 7);
        console.log('Saved branch to cookie:', branch);
        
        // Reset dependent filters
        this.currentFilters.subject = '';
        document.getElementById('subjectFilter').value = '';
        
        await this.loadSubjects(this.currentFilters.scheme, branch, this.currentFilters.sem);
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('Branch changed:', branch);
    }

    async handleSemChange() {
        const sem = document.getElementById('semFilter').value;
        this.currentFilters.sem = sem;
        
        // Reset dependent filters
        this.currentFilters.subject = '';
        document.getElementById('subjectFilter').value = '';
        
        await this.loadSubjects(this.currentFilters.scheme, this.currentFilters.branch, sem);
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('Semester changed:', sem);
    }

    async handleSubjectChange() {
        const subject = document.getElementById('subjectFilter').value;
        this.currentFilters.subject = subject;
        
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('Subject changed:', subject);
    }

    async clearAllFilters() {
        document.getElementById('schemeFilter').value = '';
        document.getElementById('branchFilter').value = '';
        document.getElementById('semFilter').value = '';
        document.getElementById('subjectFilter').value = '';
        
        this.currentFilters = { scheme: '', branch: '', sem: '', subject: '' };
        
        // ✅ FIX: Clear cookies
        this.deleteCookie('selectedScheme');
        this.deleteCookie('selectedBranch');
        
        await this.loadSubjects('', '', '');
        this.resetPagination();
        await this.loadAllDocuments(); // Load all documents when clearing filters
        this.updateFilterInfo();
        
        console.log('All filters cleared');
    }

    // ✅ FIX: Cookie persistence methods
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    // ✅ FIX: Restore filters from cookies
    restoreFiltersFromCookies() {
        const savedScheme = this.getCookie('selectedScheme');
        const savedBranch = this.getCookie('selectedBranch');
        
        if (savedScheme && this.schemes.includes(savedScheme)) {
            document.getElementById('schemeFilter').value = savedScheme;
            this.currentFilters.scheme = savedScheme;
            console.log('Restored scheme from cookie:', savedScheme);
        }
        
        if (savedBranch) {
            // We'll restore branch after branches are loaded for the scheme
            setTimeout(() => {
                const branchSelect = document.getElementById('branchFilter');
                if (branchSelect.querySelector(`option[value="${savedBranch}"]`)) {
                    branchSelect.value = savedBranch;
                    this.currentFilters.branch = savedBranch;
                    console.log('Restored branch from cookie:', savedBranch);
                }
            }, 500);
        }
    }

    updateFilterInfo() {
        const activeFilters = [];
        if (this.currentFilters.scheme) activeFilters.push(`Scheme: ${this.currentFilters.scheme}`);
        if (this.currentFilters.branch) activeFilters.push(`Branch: ${this.currentFilters.branch}`);
        if (this.currentFilters.sem) activeFilters.push(`Semester: ${this.currentFilters.sem}`);
        if (this.currentFilters.subject) activeFilters.push(`Subject: ${this.currentFilters.subject}`);
        
        const info = activeFilters.length > 0 
            ? `Active filters: ${activeFilters.join(', ')}` 
            : 'No filters applied';
            
        document.getElementById('filterInfo').textContent = info;
    }

    // ✅ FIX: Updated API endpoint for documents
    async loadDocuments() {
        this.showLoading();
        
        try {
            const params = new URLSearchParams();
            params.append('limit', this.pagination.limit.toString());
            params.append('offset', this.pagination.offset.toString());
            
            if (this.currentFilters.scheme) params.append('scheme', this.currentFilters.scheme);
            if (this.currentFilters.branch) params.append('branch', this.currentFilters.branch);
            if (this.currentFilters.sem) params.append('sem', this.currentFilters.sem);
            if (this.currentFilters.subject) params.append('subject', this.currentFilters.subject);
            
            const response = await fetch(`/api/explore/documents?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load documents');
            
            const data = await response.json();
            
            this.pagination.total = data.total || (data.docArr ? data.docArr.length : 0);
            this.displayDocuments(data.docArr || []);
            this.updatePaginationControls();
            this.updateDocumentCount();
            
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('Failed to load documents. Please try again.');
        }
    }

    displayDocuments(documents) {
        this.hideLoading();
        
        const grid = document.getElementById('documentsGrid');
        
        if (documents.length === 0) {
            this.showNoResults();
            return;
        }
        
        this.hideNoResults();
        
        grid.innerHTML = documents.map(doc => `
            <div class="document-card" data-testid="card-document-${doc.document_id || doc.materialID}">
                <div class="document-header">
                    <h3 class="document-title" data-testid="text-title-${doc.document_id || doc.materialID}">${doc.title}</h3>
                    <span class="document-badge" data-testid="badge-filetype-${doc.document_id || doc.materialID}">${doc.type || doc.fileType || 'PDF'}</span>
                </div>
                <div class="document-details">
                    <div><strong>Publisher:</strong> ${doc.publisher || 'Unknown'}</div>
                    <div><strong>Scheme:</strong> ${doc.scheme}</div>
                    <div><strong>Branch:</strong> ${doc.branch_name || doc.branch}</div>
                    <div><strong>Semester:</strong> ${doc.semester || doc.sem}</div>
                    <div><strong>Subject:</strong> ${doc.subject_name || doc.subject}</div>
                    <div><strong>Uploaded:</strong> ${new Date(doc.uploadDate || doc.created_at).toLocaleDateString()}</div>
                    <div><strong>Downloads:</strong> ${doc.downloads || 0}</div>
                </div>
                <button 
                    onclick="app.previewDocument('${doc.document_id || doc.materialID}')" 
                    class="btn btn-primary document-preview-btn"
                    data-testid="button-preview-${doc.document_id || doc.materialID}"
                >
                    Preview
                </button>
            </div>
        `).join('');
    }

    // ✅ FIX: Complete modal implementation
    async previewDocument(docId) {
        try {
            // Try to find document in current loaded documents first
            let doc = this.documents.find(d => (d.document_id || d.materialID) == docId);
            
            // If not found, fetch from API
            if (!doc) {
                const response = await fetch(`/api/explore/document/${docId}`);
                if (response.ok) {
                    doc = await response.json();
                } else {
                    // Fallback: extract from DOM if API call fails
                    const gridElement = document.querySelector(`[data-testid="card-document-${docId}"]`);
                    if (gridElement) {
                        doc = this.extractDocumentFromDOM(gridElement, docId);
                    }
                }
            }
            
            if (!doc) {
                this.showError('Document not found');
                return;
            }
            
            this.showModal(doc);
        } catch (error) {
            console.error('Error loading document preview:', error);
            this.showError('Failed to load document preview');
        }
    }

    extractDocumentFromDOM(gridElement, docId) {
        const title = gridElement.querySelector(`[data-testid="text-title-${docId}"]`)?.textContent || 'Unknown Title';
        const badge = gridElement.querySelector(`[data-testid="badge-filetype-${docId}"]`)?.textContent || 'PDF';
        const details = gridElement.querySelector('.document-details');
        
        // Extract details from DOM
        const detailsText = details?.textContent || '';
        const extractDetail = (label) => {
            const match = detailsText.match(new RegExp(`${label}:\\s*([^\\n]+)`));
            return match ? match[1].trim() : 'Unknown';
        };
        
        return {
            document_id: docId,
            title: title,
            type: badge,
            publisher: extractDetail('Publisher'),
            scheme: extractDetail('Scheme'),
            branch: extractDetail('Branch'),
            semester: extractDetail('Semester'),
            subject: extractDetail('Subject'),
            uploadDate: extractDetail('Uploaded'),
            downloads: extractDetail('Downloads')
        };
    }

    showModal(doc) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="modal-document-info">
                <h3 class="modal-document-title">${doc.title}</h3>
                <div class="modal-document-details">
                    <div><strong>Publisher:</strong> ${doc.publisher || 'Unknown'}</div>
                    <div><strong>Scheme:</strong> ${doc.scheme}</div>
                    <div><strong>Branch:</strong> ${doc.branch_name || doc.branch}</div>
                    <div><strong>Semester:</strong> ${doc.semester || doc.sem}</div>
                    <div><strong>Subject:</strong> ${doc.subject_name || doc.subject}</div>
                    <div><strong>Type:</strong> ${doc.type || doc.fileType || 'PDF'}</div>
                    <div><strong>Uploaded:</strong> ${new Date(doc.uploadDate || doc.created_at).toLocaleDateString()}</div>
                    <div><strong>Downloads:</strong> ${doc.downloads || 0}</div>
                </div>
                <div class="modal-actions">
                    <button onclick="app.downloadDocument('${doc.document_id || doc.materialID}')" class="btn btn-primary">
                        Download Document
                    </button>
                    <button onclick="app.viewDocument('${doc.document_id || doc.materialID}')" class="btn btn-outline">
                        View Online
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('previewModal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('previewModal').classList.add('hidden');
    }

    async downloadDocument(docId) {
        try {
            const response = await fetch(`/api/download/${docId}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `document_${docId}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                this.showError('Failed to download document');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            this.showError('Failed to download document');
        }
    }

    async viewDocument(docId) {
        try {
            window.open(`/api/view/${docId}`, '_blank');
        } catch (error) {
            console.error('Error viewing document:', error);
            this.showError('Failed to view document');
        }
    }

    // UI State Management Methods
    showLoading() {
        document.getElementById('loadingState')?.classList.remove('hidden');
        document.getElementById('noResultsState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.add('hidden');
        document.getElementById('documentsGrid').innerHTML = '';
    }

    hideLoading() {
        document.getElementById('loadingState')?.classList.add('hidden');
    }

    showNoResults() {
        document.getElementById('noResultsState')?.classList.remove('hidden');
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.add('hidden');
    }

    hideNoResults() {
        document.getElementById('noResultsState')?.classList.add('hidden');
    }

    showError(message) {
        const errorState = document.getElementById('errorState');
        if (errorState) {
            errorState.classList.remove('hidden');
            errorState.querySelector('.error-text').textContent = message;
        }
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('noResultsState')?.classList.add('hidden');
        console.error(message);
    }

    updateDocumentCount() {
        const countElement = document.getElementById('documentCount');
        if (countElement) {
            countElement.textContent = `${this.pagination.total} documents found`;
        }
    }

    updatePaginationControls() {
        const hasNext = (this.pagination.offset + this.pagination.limit) < this.pagination.total;
        const hasPrev = this.pagination.offset > 0;
        
        document.getElementById('prevPage').disabled = !hasPrev;
        document.getElementById('nextPage').disabled = !hasNext;
        
        const start = this.pagination.offset + 1;
        const end = Math.min(this.pagination.offset + this.pagination.limit, this.pagination.total);
        document.getElementById('paginationInfo').textContent = `Page ${Math.floor(this.pagination.offset / this.pagination.limit) + 1} of ${Math.ceil(this.pagination.total / this.pagination.limit)}`;
    }

    resetPagination() {
        this.pagination.offset = 0;
    }

    changePage(direction) {
        if (direction > 0 && (this.pagination.offset + this.pagination.limit) < this.pagination.total) {
            this.pagination.offset += this.pagination.limit;
        } else if (direction < 0 && this.pagination.offset > 0) {
            this.pagination.offset -= this.pagination.limit;
        }
        this.loadDocuments();
    }

    handleLogout() {
        // Clear cookies
        this.deleteCookie('selectedScheme');
        this.deleteCookie('selectedBranch');
        
        // Redirect to login
        window.location.href = '../login/loginPage.html';
    }

    handleUpload() {
        window.location.href = '../upload/uploadPage.html';
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StuconApp();
});