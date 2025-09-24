// Stucon Document Management System - Main JavaScript
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
        await this.loadDocuments();
        this.updateFilterInfo();
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

    async loadSchemes() {
        try {
            const response = await fetch('/api/explore/getscheme');
            if (!response.ok) throw new Error('Failed to load schemes');
            
            this.schemes = await response.json();
            
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

    async loadBranches() {
        try {
            const response = await fetch('/api/explore/getbranch');
            if (!response.ok) throw new Error('Failed to load branches');
            
            this.branches = await response.json();
            
            const select = document.getElementById('branchFilter');
            select.innerHTML = '<option value="">All Branches</option>';
            
            this.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.branchName;
                option.textContent = branch.branchName;
                option.dataset.branchId = branch.branchID;
                select.appendChild(option);
            });
            
            select.disabled = false;
        } catch (error) {
            console.error('Error loading branches:', error);
            this.showError('Failed to load branches');
        }
    }

    async loadSubjects(branchName, sem) {
        const select = document.getElementById('subjectFilter');
        select.innerHTML = '<option value="">All Subjects</option>';
        
        if (!branchName || !sem) {
            select.disabled = true;
            return;
        }
        
        try {
            const branch = this.branches.find(b => b.branchName === branchName);
            if (!branch) {
                select.disabled = true;
                return;
            }
            
            const response = await fetch(`/api/explore/getsub?branch-id=${branch.branchID}&sem=${sem}`);
            if (!response.ok) throw new Error('Failed to load subjects');
            
            this.subjects = await response.json();
            
            this.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subjectName;
                option.textContent = subject.subjectName;
                select.appendChild(option);
            });
            
            select.disabled = this.subjects.length === 0;
        } catch (error) {
            console.error('Error loading subjects:', error);
            select.disabled = true;
        }
    }

    async handleSchemeChange() {
        const scheme = document.getElementById('schemeFilter').value;
        this.currentFilters.scheme = scheme;
        
        // Reset dependent filters
        this.currentFilters.branch = '';
        this.currentFilters.sem = '';
        this.currentFilters.subject = '';
        
        document.getElementById('branchFilter').value = '';
        document.getElementById('semFilter').value = '';
        document.getElementById('subjectFilter').value = '';
        
        await this.loadSubjects('', '');
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('Scheme changed:', scheme);
    }

    async handleBranchChange() {
        const branch = document.getElementById('branchFilter').value;
        this.currentFilters.branch = branch;
        
        // Reset dependent filters
        this.currentFilters.subject = '';
        document.getElementById('subjectFilter').value = '';
        
        await this.loadSubjects(branch, this.currentFilters.sem);
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
        
        await this.loadSubjects(this.currentFilters.branch, sem);
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
        
        await this.loadSubjects('', '');
        this.resetPagination();
        await this.loadDocuments();
        this.updateFilterInfo();
        
        console.log('All filters cleared');
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
            
            const response = await fetch(`/api/explore?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load documents');
            
            const result = await response.json();
            
            this.pagination.total = result.total;
            this.displayDocuments(result.materials);
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
            <div class="document-card" data-testid="card-document-${doc.materialID}">
                <div class="document-header">
                    <h3 class="document-title" data-testid="text-title-${doc.materialID}">${doc.title}</h3>
                    <span class="document-badge" data-testid="badge-filetype-${doc.materialID}">${doc.fileType}</span>
                </div>
                <div class="document-details">
                    <div><strong>Publisher:</strong> ${doc.publisher}</div>
                    <div><strong>Scheme:</strong> ${doc.scheme}</div>
                    <div><strong>Branch:</strong> ${doc.branch}</div>
                    <div><strong>Semester:</strong> ${doc.sem}</div>
                    <div><strong>Subject:</strong> ${doc.subject}</div>
                    <div><strong>Uploaded:</strong> ${new Date(doc.uploadDate).toLocaleDateString()}</div>
                    <div><strong>Downloads:</strong> ${doc.downloads}</div>
                </div>
                <button 
                    onclick="app.previewDocument(${doc.materialID})" 
                    class="btn btn-primary document-preview-btn"
                    data-testid="button-preview-${doc.materialID}"
                >
                    Preview
                </button>
            </div>
        `).join('');
    }

    async previewDocument(docId) {
        // For now, find from current displayed documents
        // In a real app, you might want to fetch full details from API
        const gridElement = document.querySelector(`[data-testid="card-document-${docId}"]`);
        if (!gridElement) return;
        
        // Extract doc data from the grid element or make an API call
        // For simplicity, we'll use the data from the grid
        const doc = {
            materialID: docId,
            title: gridElement.querySelector(`[data-testid="text-title-${docId}"]`).textContent,
            // We'll need to store more data or make an API call for full details
        };
        if (!doc) return;
        
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="modal-document-info">
                <h3 class="modal-document-title">${doc.title}</h3>
                <div class="modal-document-details">
                    <div><strong>Publisher:</strong> ${doc.publisher}</div>
                    <div><strong>Scheme:</strong> ${doc.scheme}</div>
                    <div><strong>Branch:</strong> ${doc.branch}</div>
                    <div><strong>Semester:</strong> ${doc.sem}</div>
                    <div><strong>Subject:</strong> ${doc.subject}</div>
                    <div><strong>File Type:</strong> ${doc.fileType}</div>
                    <div><strong>Uploaded:</strong> ${doc.uploadDate}</div>
                    <div><strong>Downloads:</strong> ${doc.downloads}</div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" data-testid="button-download">
                    Download
                </button>
                <button class="btn btn-outline" data-testid="button-view-details">
                    View Details
                </button>
            </div>
        `;
        
        document.getElementById('previewModal').classList.remove('hidden');
        console.log('Preview document:', docId);
    }

    closeModal() {
        document.getElementById('previewModal').classList.add('hidden');
    }

    // UI State Management
    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('documentsGrid').classList.add('hidden');
        document.getElementById('noResultsState').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('documentsGrid').classList.remove('hidden');
    }

    showNoResults() {
        this.hideLoading();
        document.getElementById('noResultsState').classList.remove('hidden');
        document.getElementById('documentsGrid').classList.add('hidden');
    }

    hideNoResults() {
        document.getElementById('noResultsState').classList.add('hidden');
    }

    showError(message) {
        this.hideLoading();
        document.getElementById('errorState').classList.remove('hidden');
        document.getElementById('documentsGrid').classList.add('hidden');
        document.getElementById('errorState').querySelector('div').textContent = message;
    }

    // Pagination
    resetPagination() {
        this.pagination.offset = 0;
    }

    async changePage(direction) {
        const newOffset = this.pagination.offset + (direction * this.pagination.limit);
        if (newOffset >= 0 && newOffset < this.pagination.total) {
            this.pagination.offset = newOffset;
            await this.loadDocuments();
        }
    }

    updatePaginationControls() {
        const currentPage = Math.floor(this.pagination.offset / this.pagination.limit) + 1;
        const totalPages = Math.ceil(this.pagination.total / this.pagination.limit);
        
        document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        
        document.getElementById('prevPage').disabled = this.pagination.offset === 0;
        document.getElementById('nextPage').disabled = this.pagination.offset + this.pagination.limit >= this.pagination.total;
    }

    updateDocumentCount() {
        const start = this.pagination.offset + 1;
        const end = Math.min(this.pagination.offset + this.pagination.limit, this.pagination.total);
        document.getElementById('documentCount').textContent = `Showing ${start}-${end} of ${this.pagination.total} documents`;
    }

    // Navigation handlers
    async handleLogout() {
        try {
            const response = await fetch('/api/user/logout', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'student@example.com', // In real app, get from session
                    token: 'user-session-token' // In real app, get from session
                })
            });
            
            if (response.ok) {
                alert('Logged out successfully');
                // In real app, redirect to login page
            } else {
                alert('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed');
        }
    }

    handleUpload() {
        console.log('Upload triggered');
        alert('Upload functionality would be implemented here');
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StuconApp();
});